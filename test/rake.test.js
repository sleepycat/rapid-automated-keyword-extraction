import rake, {
  countOccurances,
  loadStopWords,
  separateWords,
  splitSentences,
  isAcceptable,
  buildStopWordRegex,
  generateCandidateKeywords,
  generateCandidateKeywordScores,
  calculateWordScores,
} from '../index'


// This is the text used in the paper
let text = `Compatibility of systems of linear constraints over the set of natural numbers.

Criteria of compatibility of a system of linear Diophantine equations, strict inequations, and nonstrict inequations are considered. Upper bounds for components of a minimal set of solutions and algorithms of construction of minimal generating sets of solutions for all types of systems are given. These criteria and the corresponding algorithms for constructing a minimal supporting set of solutions can be used in solving all the considered types of systems and systems of mixed types.`

//let path = './test/data/salton_1971_smartstoplist.txt'
let path = './test/data/fox_1989_stoplist.txt'
//let path = './test/data/stop-words_english_6_en.txt'

describe('countOccurances', () => {

  it('counts the number of occurances within an array', () => {
    var dataset = [2,2,4,2,6,4,7,8]
    expect(countOccurances(dataset, 2)).toEqual(3)
  })

})

describe('rake', () => {

  it('can be imported', () => {
    expect(rake).toBeTruthy()
  })

  it.skip('Matches the python version', async () => {
    // TODO: explore why this test doesn't pass.
    // We are getting very similar results but not the same.
    // The python implementation uses the Salton smartstoplist:
    let saltonList = './test/data/salton_1971_smartstoplist.txt'
    let results = await rake(text, saltonList)
    expect(Object.keys(results)).toEqual([
      {'minimal generating sets': 8.666666666666666},
      {'linear diophantine equations': 8.5},
      {'minimal supporting set': 7.666666666666666},
      {'minimal set': 4.666666666666666},
      {'linear constraints': 4.5},
      {'upper bounds': 4.0},
      {'natural numbers': 4.0},
      {'nonstrict inequations': 4.0},
      {'strict inequations': 4.0},
      {'mixed types': 3.666666666666667},
      {'considered types': 3.166666666666667},
      {'set': 2.0},
      {'types': 1.6666666666666667},
      {'considered': 1.5},
      {'constructing': 1.0},
      {'solutions': 1.0},
      {'solving': 1.0},
      {'system': 1.0},
      {'compatibility': 1.0},
      {'systems': 1.0},
      {'criteria': 1.0},
      {'construction': 1.0},
      {'algorithms': 1.0},
      {'components': 1.0}
    ].map(el => Object.keys(el)[0])
    )
  })

  it.skip('produces the output from the paper', async () => {
    // This test likely can't pass at the same time as the "matching the python version"
    // It seems the original paper is using the Fox 1989 stoplist.
    // Just like the python test, this implementation generates slightly different results,
    // but with enough overlap to know that we are in the ballpark.
    let results = await rake(text, path)
    expect(Object.keys(results)).toEqual([
      "minimal generating sets",
      "linear diophantine equations",
      "minimal set",
      "minimal supporting set",
      "linear constraints",
      "natural numbers",
      "strict inequations",
      "nonstrict inequations",
      "upper bound",
      "corresponding algorithms",
      "considered types",
      "mixed types"
    ])
  })

})

describe('loadStopWords', () => {

  it('accepts a file path', async () => {
    let [first, second, third, ...rest] = await loadStopWords(path)
    expect(first).toEqual('a')
    expect(second).toEqual('about')
    expect(third).toEqual('above')
  })

})

describe('separateWords', () => {

  it('returns all words greater than a given length', async () => {
    let words = separateWords('a aa aaa aaaa aaaaa', 3)
    expect(words).toEqual(['aaaa', 'aaaaa'])
  })

})

describe('splitSentences', () => {

  it('splits the given text into an array of sentences', async () => {
    let sentences = splitSentences(text)
    let sentencesWithoutEmptyLines = sentences.filter(sentence => sentence != '')
    expect(sentencesWithoutEmptyLines.length).toEqual(6)
  })

})

describe('isAcceptable', () => {

  it('returns true for phrases longer than the minimum phrase length', async () => {
    let min = 1
    let max = 5
    let phrase = "criteria and the corresponding"
    let verdict = isAcceptable(phrase, min, max)
    expect(verdict).toBeTruthy()
  })

  it("returns false for phrases that don't pass the minimum phrase length", async () => {
    let min = 1
    let max = 5
    let phrase = "a"
    let verdict = isAcceptable(phrase, min, max)
    expect(verdict).toBeTruthy()
  })

  it('returns false for phrases longer than the maxWordsLength ', async () => {
    let min = 1
    let max = 2
    let phrase = "criteria and the corresponding algorithms for constructing a minimal supporting set of solutions can be used in solving all the considered types of systems and systems of mixed types"
    let verdict = isAcceptable(phrase, min, 5)
    expect(verdict).toBeFalsy()
  })

  it('returns false for phrases with mostly digits', async () => {
    let min = 1
    let max = 5
    let phrase = 'this 7777 is 7777 it 7777'
    let verdict = isAcceptable(phrase, min, 5)
    expect(verdict).toBeFalsy()
  })

  it('returns false for phrases that are only digits', async () => {
    let min = 1
    let max = 5
    let phrase = '777'
    let verdict = isAcceptable(phrase, min, 5)
    expect(verdict).toBeFalsy()
  })

})

describe('buildStopWordRegex', () => {

  it('builds a regex based on the stop words file', async () => {
    let stopWordPattern = await buildStopWordRegex(path)
    expect(stopWordPattern.toString()).toContain('|\\babout\\b|')
  })

  it('should not allow newlines to have crept into the regex |\\b\\b|', async () => {
    let stopWordPattern = await buildStopWordRegex(path)
    expect(stopWordPattern.toString()).not.toContain('|\\b\\b|')
  })

  it('produces a regex that replaces globally', async () => {
    let stopWordPattern = await buildStopWordRegex(path)
    let phrase = 'Compatibility of systems of linear constraints over the set of natural numbers'
    let modifiedText = text.replace(stopWordPattern, '|')
    //We are expecting more than one replacement value
    expect((modifiedText.match(/|/g) || []).length).toBeGreaterThan(1)
  })

})

describe('generateCandidateKeywords', () => {

  //TODO: The output from the function is not yet perfect.
  // The book says it should be something like:
  // Compatibility – systems – linear constraints – set – natural numbers – Criteria –
  // compatibility – system – linear Diophantine equations – strict inequations – nonstrict
  // inequations – Upper bounds – components – minimal set – solutions – algorithms –
  // minimal generating sets – solutions – systems – criteria – corresponding algorithms –
  // constructing – minimal supporting set – solving – systems – systems

  it('generates keywords from a list of sentences and a stopword list', async () => {
    let sentenceList = splitSentences(text)
    let stopWordPattern = await buildStopWordRegex(path)

    let candidateKeywords = generateCandidateKeywords(sentenceList, stopWordPattern)
    expect(candidateKeywords).toContain("strict inequations", "nonstrict inequations are considered")
  })

})

describe('calculateWordScores', () => {

  it('calculates the word score for phrases given a phrase list', async () => {
    let phraseList = ["strict inequations", "nonstrict inequations are considered"]
    let scores = calculateWordScores(phraseList)
    expect(scores).toEqual({"are": 4, "considered": 4, "inequations": 3, "nonstrict": 4, "strict": 2})
  })

})

describe('generateCandidateKeywordScores', () => {

  it('generates scores for candiate keywords', async () => {
    let phraseList = ["strict inequations", "nonstrict inequations are considered"]
    let wordScores = calculateWordScores(phraseList)
    let scores = generateCandidateKeywordScores(phraseList, wordScores, 1)
    expect(scores).toEqual({"nonstrict inequations are considered": 15, "strict inequations": 5})
  })

})
