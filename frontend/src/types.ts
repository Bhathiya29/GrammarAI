export interface HealthResponse {
    status: string;
}

export type IssueCategory = "spelling" | "grammar" | "punctuation" | "style";

export interface Issue {
    id: string;
    start:number;
    end: number;
    category: IssueCategory;
    message: string;
    replacements: string[];
    original:string;

}

export interface CheckRequest{
    text:string;
}

export interface CheckResponse{
    issues: Issue[];
}