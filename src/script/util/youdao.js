"use strict";

import md5 from 'md5';

class Youdao {
  constructor(from, key, resType, query) {
    [this.from, this.key, this.resType, this.query] = [from, key, resType, query];
    const [FROM, TO] = ['en', 'zh-CHS'];
    let salt = Date.now();
    let sign = md5(`${this.from}${this.query}${salt}${this.key}`);
    this.requestUrl = `https://openapi.youdao.com/api?from=${FROM}&to=${TO}&appKey=${this.from}&salt=${salt}&sign=${sign}&q=${this.query}`;
  }

  isChinese(str) {
    const re = /^([\u4E00-\u9FA5]|[\uFE30-\uFFA0])+$/gi;
    return re.test(str);
  }

  removeReferrer() {
    let meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    this.noReferrer = document.querySelector('head').appendChild(meta);
  }

  parseJsonContent(res) {
    let word, explains, pronoun, wav, relate = [], more;
    res = (typeof res === 'string') ? JSON.parse(res) : res;

    word = this.query;
    if (!res) {
      explains = 'Nothing found.';
    } else if (Object.is(typeof res, 'string')) {
      explains = res.toString();
    } else if (!res.basic) {
      explains = res.translation[0];
    } else {
      explains = res.basic.explains;
      res.basic.phonetic && (pronoun = res.basic.phonetic.split(';')[0]);
      !this.isChinese(word) && (wav = `https://dict.youdao.com/dictvoice?audio=${word}&type=2`);
      res.web && (relate = res.web);
    }
    more = `http://dict.youdao.com/search?q=${res.query}`;

    return {word, wav, explains, pronoun, relate, more};
  }

  parseXmlContent(res) {
    let word, explains, pronoun, wav, relate = [], more;
    res = (new DOMParser()).parseFromString(res, 'text/xml');

    word = res.querySelector('query').textContent.toString().trim();
    if (!res) {
      explains = 'Nothing found.';
    } else if (Object.is(typeof res, 'string')) {
      explains = res.toString().trim();
    } else if (!res.querySelectorAll('basic').length) {
      explains = res.querySelector('translation').querySelector('paragraph').textContent.toString().trim();
    } else {
      let explainsNode = res.querySelector('basic').querySelector('explains').querySelectorAll('ex');
      explains = [...explainsNode].map(v => v.textContent.toString().trim());
      pronoun = res.querySelector('basic').querySelector('phonetic').textContent.toString().trim() || undefined;
      !this.isChinese(word) && (wav = `https://dict.youdao.com/dictvoice?audio=${word}&type=2`);

      let relates = [...res.querySelector('web').querySelector('explain')];
      if (relates.length) {
        relate = relates.map(v => {
          let dummy = {};
          dummy.key = v.querySelector('key').textContent.toString().trim();
          dummy.relate = [...v.querySelector('value')].map(v => val.textContent.toString().trim());
          return dummy;
        });
      }
    }
    more = res.querySelector('query')[0].textContent.toString().trim();

    return {word, wav, explains, pronoun, relate, more};
  }

  getContent() {
    let _this = this;
    _this.removeReferrer();

    return new Promise((resolve, reject) => {
      fetch(`${this.requestUrl}`)
        .then(res => {
          if (res.ok) {
            res.json().then(data => {
              let result;
              if (data.errorCode !== '0') {
                reject('Query failed');
                return;
              }
              result = _this.parseJsonContent(data);
              resolve(result);
            });
          } else {
            reject('Query failed');
          }
        }, err => {
          reject('Query failed');
        }).then(res => {
          if (_this.noReferrer) {
            _this.noReferrer.remove();
            _this.noReferrer = null;
          }
        });
    });
  }

  static addToWordBook(word) {
    const wordBookLoginUrl = 'http://account.youdao.com/login?service=dict&back_url=http://dict.youdao.com/wordbook/wordlist%3Fkeyfrom%3Dnull';
    const addToWordBookApi = 'https://dict.youdao.com/wordbook/ajax?action=addword&q=';
    const wordBookDomain = 'dict.youdao.com';
    // I think the api is made by an intern: adddone => addone
    const [noUser, addOne] = ['nouser', 'adddone'];

    let headers = new Headers();
    if(chrome && chrome.cookies) {
      chrome.cookies.getAll({}, (cookies) => {
        cookies.forEach(cookie => {
          if(Object.is(cookie.domain, wordBookDomain)) {
            headers.append('Cookie', `${cookie.name}=${cookie.value}`);
          }
        });
      });
    }

    return new Promise((resolve, reject) => {
      require('./fetch')(`${addToWordBookApi}${word}`, {
        method: 'GET',
        headers: headers,
        mode: 'cors',
        cache: 'default'
      }).then(res => {
        if(res.ok) {
          res.json().then(data => {
            if(Object.is(data.message, noUser)) {
              if(chrome && chrome.tabs) {
                chrome.tabs.create({url: wordBookLoginUrl});
              } else {
                window.open(wordBookLoginUrl, '_blank');
              }
              resolve({added: false});
            } else if(Object.is(data.message, addOne)) {
              resolve({added: true});
            }
          });
        } else {
          reject();
        }
      }, err => {
        reject(err);
      });
    });
  }
}

export default Youdao;
