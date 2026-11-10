from typing import Literal, List
from pydantic import BaseModel, Field

class CheckRequest(BaseModel):
    text: str = Field(
        ..., 
        max_length = 5000,
        description="The text to be checked. Max 5,000 characters."
        )

class Issue(BaseModel):
    id:str
    start:int
    end:int
    category:Literal["spelling", "grammar", "punctuation", "style"]
    message:str
    replacements: List[str]
    original : str

class CheckResponse(BaseModel):
    issues: List[Issue] =[]
