export interface ScoreRow {
    id: number;
    player_name: string;
    score: number;
    created_at: string;
}

export interface TopPlayer {
    player_name: string;
    best_score: number;
}

export interface PostBody {
    playerName: string;
    playerScore: number;
}