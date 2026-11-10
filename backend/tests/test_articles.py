from app.checkers.articles import ArticleChecker

checker = ArticleChecker()

def test_article_flags_incorrect_a_apple():
    issues = checker.check("a apple")
    assert len(issues) == 1
    assert issues[0].original == "a"
    assert issues[0].replacements == ["an"]

def test_article_flags_incorrect_a_hour():
    issues = checker.check("a hour")
    assert len(issues) == 1
    assert issues[0].original == "a"
    assert issues[0].replacements == ["an"]

def test_article_correct_an_apple_and_hour():
    issues = checker.check("an apple and an hour")
    assert len(issues) == 0

def test_article_correct_university_and_user():
    issues = checker.check("a university and a user")
    assert len(issues) == 0

def test_article_flags_incorrect_an_university():
    issues = checker.check("an university")
    assert len(issues) == 1
    assert issues[0].original == "an"
    assert issues[0].replacements == ["a"]

def test_article_capitalization_preserved():
    issues = checker.check("A apple")
    assert len(issues) == 1
    assert issues[0].replacements == ["An"]

def test_edge_cases_no_crash():
    # End of text, punctuation, digits, acronyms, unknown words
    issues = checker.check("An a. a 5. a FBI. a blorptastic thing.")
    assert len(issues) == 0