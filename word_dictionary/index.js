class TrieNode {
    constructor() {
        this.children = new Map();
        this.isEndOfWord = false;
        this.definition = null;
    }
}


class WordDictionary {
    constructor() {
        this.root = new TrieNode();
        this.wordMap = new Map();
    }
    addWord(word, definition) {
        word = word.toLowerCase();
        let node = this.root;
        for (const char of word) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }
        node.isEndOfWord = true;
        node.definition = definition;
        this.wordMap.set(word, definition);

        // console.log("----", this.root);
    }

    searchWord(word) {
        if (!word || typeof word !== 'string') {
            return 'Not found';
        }
        word = word.toLowerCase();
        return this.wordMap.get(word) || 'Not found';
    }

    autocomplete(prefix) {
        if (!prefix || typeof prefix !== 'string') {
            return [];
        }
        prefix = prefix.toLowerCase();
        let node = this.root;
        for (const char of prefix) {
            if (!node.children.has(char)) {
                return [];
            }
            node = node.children.get(char);
        }
        console.log("node",node);
        return this._collectWords(node, prefix);
    }
    _collectWords(node, prefix) {
        let results = [];
        if (node.isEndOfWord) {
            results.push({ word: prefix, definition: node.definition });
        }
        for (let [char, child] of node.children) {
            // console.log("char",char,"child",child);
            results = results.concat(this._collectWords(child, prefix + char));
        }
        return results;
    }

    deleteWord(word) {
        if (!word || typeof word !== 'string') {
            return false;
        }
        word = word.toLowerCase();
        if (!this.wordMap.has(word)) {
            return false;
        }
        this.wordMap.delete(word);
        this._deleteHelper(this.root, word, 0);
        return true;
    }
    
    _deleteHelper(node, word, index) {
        if (index === word.length) {
            if (!node.isEndOfWord) {
                return false;
            }
            node.isEndOfWord = false;
            return node.children.size === 0;
        }
        const char = word[index];
        const childNode = node.children.get(char);
        if (!childNode) {
            return false;
        }
        const shouldDeleteChild = this._deleteHelper(childNode, word, index + 1);
        if (shouldDeleteChild) {
            node.children.delete(char);
            return node.children.size === 0 && !node.isEndOfWord;
        }
        return false;
    }


}

const dict = new WordDictionary();
dict.addWord("apple", "A fruit that grows on trees.");
dict.addWord("app", "A software application.");

console.log(dict.searchWord("apple"));
console.log(dict.searchWord("banana"));

console.log(dict.autocomplete("app"));

console.log(dict.autocomplete("app"));

console.log(dict.deleteWord("app"));


console.log(dict.searchWord("app"));

console.log(dict.autocomplete("app"));