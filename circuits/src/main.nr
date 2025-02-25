// zkVote - Noir Circuit for Vote Validity & Tally Verification

// Vote Validity Circuit
fn vote_validity(vote: u32) {
    assert(vote >= 1, "Invalid vote: must be at least 1");
    assert(vote <= 4, "Invalid vote: must be at most 4");
}

// Tally Verification Circuit
fn tally_verification(encrypted_sum: u32, total_votes: u32) {
    assert(encrypted_sum == total_votes, "Tally verification failed");
}

// Unified Main Function
fn main(vote: pub u32, encrypted_sum: pub u32, total_votes: pub u32) {
    vote_validity(vote); // Validate individual vote
    tally_verification(encrypted_sum, total_votes); // Verify tally correctness
}
