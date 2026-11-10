from abc import ABC, abstractmethod
from app.schemas import Issue
from typing import List

class Checker(ABC):
    name: str
    # Setting a default priority
    priority: int = 50  

    @abstractmethod
    def check(self, text: str) -> list[Issue]:
        pass