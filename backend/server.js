import express from "express";
import { encryptVote, homomorphicAdd, decryptTotal } from "./encryption.js";
import fs from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";
import cors from "cors";
import { saveVote, getVotes } from "./database.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Helper function to write Prover.toml
function writeProverToml(vote, encryptedSum, totalVotes) {
    const content = `vote = "${vote}"
encrypted_sum = "${encryptedSum}"
total_votes = "${totalVotes}"`;
    fs.writeFileSync("../circuits/Prover.toml", content);
}

// Endpoint to receive encrypted votes
app.post("/submit-vote", async (req, res) => {
    try {
        const { vote } = req.body;
        if (!vote || ![1, 2, 3, 4].includes(vote)) {
            return res.status(400).json({ error: "Invalid vote: must be between 1 and 4" });
        }
    
        // Encrypt the vote and save to the database
        const encryptedVote = encryptVote(vote);
        await saveVote(encryptedVote);
    
        return res.json({ message: "Vote submitted successfully", encryptedVote });
    } catch (error) {
        console.error("Error submitting vote:", error);
        return res.status(500).json({ error: "Failed to submit vote" });
    }
});
  
// Endpoint to tally encrypted votes and generate proof
app.get("/tally", async (req, res) => {
    try {
        const votes = await getVotes();
    
        if (!votes || votes.length === 0) {
            return res.json({ message: "No votes yet", totalVotes: 0 });
        }
    
        // Perform homomorphic addition on encrypted votes
        const encryptedSum = homomorphicAdd(votes);
        if (!encryptedSum || !encryptedSum.C1 || !encryptedSum.C2) {
            throw new Error("Invalid encrypted sum");
        }
    
        const totalVotes = decryptTotal(encryptedSum);
        const safeTotal = Math.max(1, totalVotes); // Ensure it's never 0
    
        // Write to Prover.toml with proper formatting
        writeProverToml("2", safeTotal.toString(), safeTotal.toString());
    
        // Execute proof generation commands
        try {
            execSync("cd ../circuits && nargo execute", { stdio: "inherit" });
            execSync("bb prove -b ../circuits/target/zkvote.json -w ../circuits/target/zkvote.gz -o ../circuits/target/proof", { stdio: "inherit" });
            execSync("bb write_vk -b ../circuits/target/zkvote.json -o ../circuits/target/vk", { stdio: "inherit" });
            execSync("bb verify -k ../circuits/target/vk -p ../circuits/target/proof", { stdio: "inherit" });
        } catch (error) {
            console.error("Proof generation or verification failed:", error);
            return res.status(500).json({ error: "ZK proof verification failed" });
        }
    
        const proof = fs.readFileSync("../circuits/target/proof").toString("hex");
        return res.json({ 
            totalVotes: safeTotal,
            proof,
            encryptedSum: encryptedSum.C1
        });
    } catch (error) {
        console.error("Error generating tally:", error);
        return res.status(500).json({ error: "Failed to generate tally" });
    }
});

// Endpoint to list encrypted votes
app.get("/votes", async (req, res) => {
    try {
        const votes = await getVotes();
        
        if (!votes || votes.length === 0) {
            return res.json({ message: "No votes stored", votes: [] });
        }
        return res.json({ votes, count: votes.length });
    } catch (error) {
        console.error("Error retrieving votes:", error);
        return res.status(500).json({ error: "Failed to retrieve votes" });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`zkVote backend running on port ${PORT}`));