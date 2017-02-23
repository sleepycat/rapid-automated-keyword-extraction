import fsp from 'fs-promise'
import { fromPairs, sortBy, toPairs } from 'lodash'

function isNumber(str) {
  return /\d/.test(str)
}

// TODO: smaller functions should be extracted from this
export function isAcceptable (phrase, minCharLength, maxWordsLength) {
  // a phrase must have a min length in characters
  if(phrase < minCharLength) {
    return false
  }
  // a phrase must have a max number of words
  let words = phrase.split(' ')
  if(words.length > maxWordsLength) {
    return false
  }

  let digits = 0
  let alpha = 0
  //is there a better way to do this?
  for(let i = 0; i < phrase.length; i++) {
    if(/\d/.test(phrase[i])) digits += 1
    if(/[a-zA-Z]/.test(phrase[i])) alpha += 1
  }

  // a phrase must have at least one alpha character
  if(alpha == 0) {
    return false
  }

  // a phrase must have more alpha than digits characters
  if(digits > alpha) {
    return false
  }

  return true
}

export function countOccurances (haystack, needle) {
  return haystack.reduce((n, value) => {
        return n + (value === needle)
  }, 0)
}

export function generateCandidateKeywordScores (phraseList, wordScore, minKeywordFrequency = 1) {

  let keywordCandidates = {}

  phraseList.forEach(phrase => {
    if(minKeywordFrequency > 1) {
      if(countOccurances(phraseList, phrase) < minKeywordFrequency) {
	return
      }
    }
    phrase in keywordCandidates || (keywordCandidates[phrase] = 0)
    let wordList = separateWords(phrase, 0)
    let candidateScore = 0
    wordList.forEach(word => {
      candidateScore += wordScore[word]
      keywordCandidates[phrase] = candidateScore
    })
  })
  return keywordCandidates
}

export function separateWords (text, minWordReturnSize) {
  let wordDelimiters = /[^a-zA-Z0-9_\+\-/]/
  let words = []
  text.split(wordDelimiters).forEach(singleWord => {
    let currentWord = singleWord.trim().toLowerCase()
    //leave numbers in phrase, but don't count as words, since they tend to invalidate scores of their phrases
    if(currentWord.length > minWordReturnSize && currentWord != '' && !isNumber(currentWord)) {
      words.push(currentWord)
    }
  })
  return words
}

export function calculateWordScores (phraseList) {
  let wordFrequency = {}
  let wordDegree = {}
  phraseList.forEach(phrase => {
    let wordList = separateWords(phrase, 0)
    let wordListLength = wordList.length
    let wordListDegree = wordListLength - 1
    wordList.forEach(word => {
      word in wordFrequency || (wordFrequency[word] = 0)
      wordFrequency[word] += 1
      word in wordDegree || (wordDegree[word] = 0)
      wordDegree[word] += wordListDegree
    })
  })

  Object.keys(wordFrequency).forEach(item => {
    wordDegree[item] = wordDegree[item] + wordFrequency[item]
  })

  // Calculate Word scores = deg(w)/frew(w)
  let wordScore = {}
  Object.keys(wordFrequency).forEach(item => {
    item in wordScore || (wordScore[item] = 0)
    wordScore[item] = wordDegree[item] / (wordFrequency[item] * 1.0)
  })

  return wordScore
}


export function generateCandidateKeywords (sentenceList, stopWordPattern, minCharLength = 1, maxWordsLength = 5) {
  let phraseList = []
  sentenceList.forEach(sentence => {
    let tmp = stopWordPattern[Symbol.replace](sentence, '|')
    let phrases = tmp.split("|")
    phrases.forEach(ph => {
      let phrase = ph.trim().toLowerCase()

      if(phrase != "" && isAcceptable(phrase, minCharLength, maxWordsLength)) {
	phraseList.push(phrase)
      } else {
      }
    })
  })
  return phraseList
}

export async function buildStopWordRegex (path) {
  let stopWordList = await loadStopWords(path)
  let stopWordRegexList = []
  stopWordList.forEach(word => {
    if(/\w+/.test(word)) {
    // match only stop words surrounded by word boundaries (\b)
    let wordRegex = `\\b${word}\\b`
    stopWordRegexList.push(wordRegex)
    }
  })
  let stopWordPattern = new RegExp(stopWordRegexList.join('|'), 'ig')
  return stopWordPattern
}

export function splitSentences (text) {
  let sentenceDelimiters = /[\[\]\n.!?,;:\t\\-\\"\\(\\)\\\'\u2019\u2013]/
  return text.split(sentenceDelimiters)
}

export async function loadStopWords (path) {
  let contents = await fsp.readFile(path, {encoding:'utf8'})

  //TODO: we are assuming one word per line
  return contents.split(/\n/)
}

export default async function rake (text, stopWordsPath, minCharLength=3, maxWordsLength=5, minKeywordFrequency=1) {
  let stopWordPattern = await buildStopWordRegex(stopWordsPath)
  let sentenceList = splitSentences(text)
  console.log('sentenceList', sentenceList)
  let phraseList = generateCandidateKeywords(sentenceList, stopWordPattern, minCharLength, maxWordsLength)
  let wordScores = calculateWordScores(phraseList)
  let keywordCandidates = generateCandidateKeywordScores(phraseList, wordScores, minKeywordFrequency)
  let sortedKeywords = fromPairs(sortBy(toPairs(keywordCandidates), (pair) => pair[1]).reverse())
  return sortedKeywords
}

