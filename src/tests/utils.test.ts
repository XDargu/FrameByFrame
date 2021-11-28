import { assert, expect } from 'chai';
import * as Utils from "../utils/utils"

describe('Utils', () => {
  describe('clamp', () => {

    it('respects min bounds', () => {
      const result = Utils.clamp(-4, 0, 5);
      expect(result).to.equal(0);
    });

    it('respects max bounds', () => {
      const result = Utils.clamp(15, 0, 5);
      expect(result).to.equal(5);
    });

  });

  describe('rgbToHex', () => {

    it('converts RGB(255,255,255) to #ffffff', () => {
      const result = Utils.rgbToHex({r: 255, g: 255, b: 255});
      expect(result).to.equal("#ffffff");
    });

    it('converts RGB(255,0,0) #ff0000', () => {
      const result = Utils.rgbToHex({r: 255, g: 0, b: 0});
      expect(result).to.equal("#ff0000");
    });

    it('returns the same value when using hexToRgb', () => {
      const hexColor = '#c4ff46';
      const result = Utils.rgbToHex(Utils.hexToRgb(hexColor));
      expect(result).to.equal(hexColor);
    });

  });

  describe('isHexColor', () => {

    it('returns true for correct colors', () => {
      expect(Utils.isHexColor('#AAABBB')).to.be.true;
      expect(Utils.isHexColor('#274CBA')).to.be.true;
      expect(Utils.isHexColor('#FFFFFF')).to.be.true;
      expect(Utils.isHexColor('#012345')).to.be.true;
      expect(Utils.isHexColor('#6789AB')).to.be.true;
    });

    it('returns false for colors without hash', () => {
      expect(Utils.isHexColor('FFFFFF')).to.be.false;
      expect(Utils.isHexColor('012345')).to.be.false;
      expect(Utils.isHexColor('6789AB')).to.be.false;
    });

    it('returns false for non-hex values', () => {
      expect(Utils.isHexColor('#FFFFFG')).to.be.false;
      expect(Utils.isHexColor('#01234K')).to.be.false;
      expect(Utils.isHexColor('#6789AT')).to.be.false;
    });

    it('returns false for hex of wrong length', () => {
      expect(Utils.isHexColor('#FFF')).to.be.false;
      expect(Utils.isHexColor('#01234')).to.be.false;
      expect(Utils.isHexColor('#FFFFFFF')).to.be.false;
    });
    
  });

  describe('colorFromHash', () => {

    it('returns the same color for the same value', () => {
      for (let i=0; i<20; ++i)
      {
        const val1 = Utils.colorFromHash(i);
        const val2 = Utils.colorFromHash(i);
        expect(val1).to.equal(val2);
      }
    });

    it('returns values correctly formatted', () => {
      for (let i=0; i<20; ++i)
      {
        const color = Utils.colorFromHash(i);
        const isHexColor = Utils.isHexColor(color);
        expect(isHexColor).to.be.true;
      }
    });

    it('returns a value with a negative hash', () => {
      const val = Utils.colorFromHash(-23);
      expect(val).to.be.not.undefined;
    });
    
  });

  describe('blend', () => {

    var black = {r: 0, g: 0, b: 0};
    var white = {r: 255, g: 255, b: 255};
    var red = {r: 255, g: 0, b: 0};
    var yellow = {r: 255, g: 255, b: 0};

    it('blends white and black at 0.5 to gray', () => {
      const result = Utils.blend(black, white, 0.5);
      expect(result).property("r").to.equal(128);
      expect(result).property("g").to.equal(128);
      expect(result).property("b").to.equal(128);
    });

    it('blends red and yelow at 0.5 to orange', () => {
      const result = Utils.blend(red, yellow, 0.5);
      expect(result).property("r").to.equal(255);
      expect(result).property("g").to.equal(128);
      expect(result).property("b").to.equal(0);
    });

    it('blends red and yelow at 0 to red', () => {
      const result = Utils.blend(red, yellow, 0);
      expect(result).property("r").to.equal(red.r);
      expect(result).property("g").to.equal(red.g);
      expect(result).property("b").to.equal(red.b);
    });

    it('blends red and yelow at 1 to yellow', () => {
      const result = Utils.blend(red, yellow, 1);
      expect(result).property("r").to.equal(yellow.r);
      expect(result).property("g").to.equal(yellow.g);
      expect(result).property("b").to.equal(yellow.b);
    });

    it('clamps negative values', () => {
      const red = {r: 255, g: 0, b: 0};
      const yellow = {r: 255, g: 255, b: 0};
      const result = Utils.blend(red, yellow, -2);
      expect(result).property("r").to.equal(255);
      expect(result).property("g").to.equal(0);
      expect(result).property("b").to.equal(0);
    });

    it('clamps values above 1', () => {
      const red = {r: 255, g: 0, b: 0};
      const yellow = {r: 255, g: 255, b: 0};
      const result = Utils.blend(red, yellow, 1);
      expect(result).property("r").to.equal(255);
      expect(result).property("g").to.equal(255);
      expect(result).property("b").to.equal(0);
    });

  });

  describe('filterText', () => {

    it('finds "st" in "test"', () => {
      const filter = "st";
      const content = "test";
      const result = Utils.filterText(filter, content);
      expect(result).to.be.true;
    });

    it('does not find "a" in "test"', () => {
      const filter = "a";
      const content = "test";
      const result = Utils.filterText(filter, content);
      expect(result).to.be.false;
    });
    
  });

  describe('pushUnique', () => {

    it('adds an element not in the vector', () => {
      const vector = [1, 2, 3];
      Utils.pushUnique(vector, 5);
      expect(vector.length).to.equal(4);
      expect(vector).to.contain(5)
    });

    it('does not add an element already in the vector', () => {
      const vector = [1, 2, 3];
      Utils.pushUnique(vector, 3);
      expect(vector.length).to.equal(3);
      expect(vector).to.contain(3)
    });
    
  });

});