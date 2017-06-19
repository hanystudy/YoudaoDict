'use strict';

import 'mocha';
import {expect} from 'chai';
import fetch from 'node-fetch';
import Youdao from '../src/script/util/youdao';
import md5 from 'md5';

describe(`Youdao`, () => {
  const [FROM, TO, DOCTYPE, QUERY, KEY, SECRET] = [`en`, 'zh-CHS', `json`, `require`, '243870cca0d63a90', '9cT837z1qrNa1SS3CJgZTY9rqPBk78Xa'];
  let salt = Date.now()
  let sign = md5(`${KEY}${QUERY}${salt}${SECRET}`);
  const REQ_URL = `https://openapi.youdao.com/api?from=${FROM}&to=${TO}&appKey=${KEY}&salt=${salt}&sign=${sign}&q=${QUERY}`;
  const URL_REG = /^(ftp|https?:\/\/)?(((www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b)|localhost|(([1-9]\d{2}\.){3}[1-9]\d{2}))([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/i;

  let youdao = new Youdao(FROM, KEY, DOCTYPE, QUERY);

  describe(`#isChinese()`, () => {
    it(`should be Chinese`, () => {
      expect(youdao.isChinese(`摩卡`)).to.equal(true);
      expect(youdao.isChinese(`摩卡摩卡摩卡摩卡摩卡摩卡摩卡摩卡摩卡摩卡`)).to.equal(true);
    });

    it(`should not be Chinese`, () => {
      expect(youdao.isChinese()).to.equal(false);
      expect(youdao.isChinese(`mocha`)).to.equal(false);
      expect(youdao.isChinese(` mocha`)).to.equal(false);
      expect(youdao.isChinese(` mocha `)).to.equal(false);
      expect(youdao.isChinese(`摩卡m`)).to.equal(false);
      expect(youdao.isChinese(`m摩卡`)).to.equal(false);
      expect(youdao.isChinese(`摩卡 `)).to.equal(false);
      expect(youdao.isChinese(` 摩卡`)).to.equal(false);
    });
  });

  describe(`#parseJsonContent()`, () => {
    let parsedJson = {};

    before((done) => {
      fetch(REQ_URL).then(res => {
          res.json().then(json => {
              parsedJson = youdao.parseJsonContent(json);
              done();
          }).catch(res => done())
      }).catch(res => done())
    });

    it(`should has necessary properties`, () => {
      expect(parsedJson).to.have.ownProperty(`word`);
      expect(parsedJson).to.have.ownProperty(`explains`);
      expect(parsedJson).to.have.ownProperty(`pronoun`);
      expect(parsedJson).to.have.ownProperty(`relate`);
      expect(parsedJson).to.have.ownProperty(`more`);
    });

    it('should has valid properties', () => {
      expect(parsedJson.word).to.be.a('string');
      expect(parsedJson.wav).to.match(URL_REG);
      expect(parsedJson.explains).to.be.an('array');
      expect(parsedJson.pronoun).to.be.a('string');
      expect(parsedJson.relate).to.be.an('array');
      parsedJson.relate.forEach(it => {
        expect(it).to.has.ownProperty('value').and.has.ownProperty('key');
        expect(it.value).to.be.an('array');
        expect(it.key).to.be.a('string');
      });
      expect(parsedJson.more).to.match(URL_REG);
    });
  });
});
