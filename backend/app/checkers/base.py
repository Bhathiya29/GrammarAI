from abc import ABC, abstractmethod
from app.schemas import Issue

class Checker(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def check(self, text: str) -> list[Issue]:
        pass