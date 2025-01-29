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

  describe('arrayMax', () => {

    it('works with empty arrays', () => {
      const result = Utils.arrayMax([]);
      expect(result).to.equal(-Infinity);
    });

    it('finds max value', () => {
        const result = Utils.arrayMax([4, 2, 3, -6]);
        expect(result).to.equal(4);
    });

    it('finds max value with negative numbers', () => {
        const result = Utils.arrayMax([-1, -2, -6, -7]);
        expect(result).to.equal(-1);
    });

  });

  describe('compareStringArrays', () => {

    it('works with empty arrays', () => {
      const result = Utils.compareStringArrays([], []);
      expect(result).to.equal(true);
    });

    it('returns true for equal string arrays', () => {
        expect(Utils.compareStringArrays(["abc", "test", "test2"], ["abc", "test", "test2"])).to.equal(true);
        expect(Utils.compareStringArrays(["abc", "test"], ["abc", "test"])).to.equal(true);
        expect(Utils.compareStringArrays(["abc"], ["abc"])).to.equal(true);
    });

    it('returns false for different string arrays', () => {
        expect(Utils.compareStringArrays(["abc", "test"], ["abc", "test2"])).to.equal(false);
        expect(Utils.compareStringArrays(["abc"], ["abc", "test"])).to.equal(false);
        expect(Utils.compareStringArrays(["abc", "test"], ["abc"])).to.equal(false);
        expect(Utils.compareStringArrays([], ["abc"])).to.equal(false);
        expect(Utils.compareStringArrays(["abc", "test"], [])).to.equal(false);
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

  describe('rgbToHsl', () => {

    it('converts RGB(255, 87, 51) to (11, 100, 60)', () => {
      const result = Utils.rgbToHsl({r: 255, g: 87, b: 51});

      expect(result).property("h").to.equal(11);
      expect(result).property("s").to.equal(100);
      expect(result).property("l").to.equal(60);
    });

    it('converts RGB(255,0,0) to (0, 100, 50)', () => {
      const result = Utils.rgbToHsl({r: 255, g: 0, b: 0});
      expect(result).property("h").to.equal(0);
      expect(result).property("s").to.equal(100);
      expect(result).property("l").to.equal(50);
    });

    it('converts RGB(117, 138, 179) to (220, 29, 58)', () => {
        const result = Utils.rgbToHsl({r: 117, g: 138, b: 179});
        expect(result).property("h").to.equal(220);
        expect(result).property("s").to.equal(29);
        expect(result).property("l").to.equal(58);
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

    it('returns a value with an empty color table', () => {
      const val = Utils.colorFromHash(6, []);
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

  describe('searchLastSortedInsertionPos', () => {

    const comparator = (fromArray: number, value: number) => { return fromArray > value; }

    it('finds the correct index in a consecutive sorted array', () => {
      const vector = [1, 2, 3, 4, 5, 6, 7];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 4, comparator);
      expect(foundIndex).to.equal(4)
    });

    it('finds the correct index in non-consecutive a sorted array', () => {
      const vector = [1, 3, 12, 55, 128];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 4, comparator);
      expect(foundIndex).to.equal(2)
    });

    it('finds the correct index if it is the first item', () => {
      const vector = [1, 3, 12, 55, 128];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 0, comparator);
      expect(foundIndex).to.equal(0)
    });

    it('finds the correct index if it is the last item', () => {
      const vector = [1, 3, 12, 55, 128];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 200, comparator);
      expect(foundIndex).to.equal(5)
    });

    it('returns 0 on an empy array', () => {
      const vector: number[] = [];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 200, comparator);
      expect(foundIndex).to.equal(0)
    });

    it('returns 0 on the first element', () => {
      const vector = [1, 2, 3];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 0, comparator);
      expect(foundIndex).to.equal(0)
    });

    it('returns the last index on the last element', () => {
      const vector = [1, 2, 3];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 3, comparator);
      expect(foundIndex).to.equal(3)
    });

    it('returns 0 with an array of 1 item and a value smaller than it', () => {
      const vector = [3];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 1, comparator);
      expect(foundIndex).to.equal(0)
    });

    it('returns 1 with an array of 1 item and a value biffer than it', () => {
      const vector = [3];
      const foundIndex = Utils.searchLastSortedInsertionPos(vector, 5, comparator);
      expect(foundIndex).to.equal(1)
    });
    
  });

  describe('insertSorted', () => {

    const comparator = (fromArray: number, value: number) => { return fromArray > value; }

    it('inserts into empty array', () => {
      const vector: number[] = [];
      Utils.insertSorted(vector, 2, comparator);
      expect(vector.length).to.equal(1);
      expect(vector).to.contain(2);
    });

    it('inserts into array with one item at the end', () => {
      const vector = [1];
      Utils.insertSorted(vector, 2, comparator);
      expect(vector).deep.equal([1, 2]);
    });

    it('inserts into array with one item at the beginning', () => {
      const vector = [5];
      Utils.insertSorted(vector, 2, comparator);
      expect(vector).deep.equal([2, 5]);
    });

    it('inserts into array with multiple items at the end', () => {
      const vector = [2, 5, 7];
      Utils.insertSorted(vector, 9, comparator);
      expect(vector).deep.equal([2, 5, 7, 9]);
    });

    it('inserts into array with multiple items in the middle', () => {
      const vector = [2, 5, 7];
      Utils.insertSorted(vector, 6, comparator);
      expect(vector).deep.equal([2, 5, 6, 7]);
    });

  });

  describe('getEntityIdUniqueId', () => {

    it('correctly returns same entityId after converting to unique', () => {
      const entityId = 128;
      const clientId = 7;
      const uniqueId = Utils.toUniqueID(clientId, entityId);
      const result = Utils.getEntityIdUniqueId(uniqueId);
      expect(entityId).to.equal(result);
    });

    it('correctly returns same entityId after converting to unique with a big value', () => {
      const entityId = 35184372088831;
      const clientId = 7;
      const uniqueId = Utils.toUniqueID(clientId, entityId);
      const result = Utils.getEntityIdUniqueId(uniqueId);
      expect(entityId).to.equal(result);
    });

  });

  describe('getClientIdUniqueId', () => {

    it('correctly returns same clientId after converting to unique', () => {
      const entityId = 128;
      const clientId = 7;
      const uniqueId = Utils.toUniqueID(clientId, entityId);
      const result = Utils.getClientIdUniqueId(uniqueId);
      expect(clientId).to.equal(result);
    });

    it('correctly returns same clientId after converting to unique with a big EntityID', () => {
      const entityId = 35184372088831;
      const clientId = 7;
      const uniqueId = Utils.toUniqueID(clientId, entityId);
      const result = Utils.getClientIdUniqueId(uniqueId);
      expect(clientId).to.equal(result);
    });

  });

  describe('numberToPaddedString', () => {

    it('returns correct number of leading zeroes', () => {
      expect(Utils.numberToPaddedString(3, 2)).to.equal("03");
      expect(Utils.numberToPaddedString(67, 4)).to.equal("0067");
      expect(Utils.numberToPaddedString(5, 3)).to.equal("005");
    });

    it('returns no leading zeroes when not needed', () => {
      expect(Utils.numberToPaddedString(35, 2)).to.equal("35");
      expect(Utils.numberToPaddedString(1967, 4)).to.equal("1967");
      expect(Utils.numberToPaddedString(543, 3)).to.equal("543");
    });

    it('returns entire number when padding is smaller', () => {
      expect(Utils.numberToPaddedString(35, 1)).to.equal("35");
      expect(Utils.numberToPaddedString(1967, 2)).to.equal("1967");
      expect(Utils.numberToPaddedString(543, 2)).to.equal("543");
    });
  });

  describe('getFormattedString', () => {

    const formatTable = {
      '%a': 'TEST',
      '%BBb': 'FORMAT',
      '%f56': 'TABLE',
      '%%': '%'
    }
    
    it('correctly returns a formatted name', () => {
      const format = 'test_%a:%BBb_%f56_%a';
      const result = Utils.getFormattedString(format, formatTable);
      expect(result).to.equal('test_TEST:FORMAT_TABLE_TEST');
    });

    it('does not convert escape characters', () => {
      const format = 'test_%a:%%a_%%%a';
      const result = Utils.getFormattedString(format, formatTable);
      expect(result).to.equal('test_TEST:%a_%TEST');
    });

  });

  describe('compareVersions', () => {

    it('returns true for later updates', () => {
      expect(Utils.compareVersions('1.5.2', '1.5.0')).to.equal(true);
      expect(Utils.compareVersions('2.0', '1.5')).to.equal(true);
      expect(Utils.compareVersions('2.0', '1.5.2')).to.equal(true);
      expect(Utils.compareVersions('5.0.6.2', '1.0')).to.equal(true);
      expect(Utils.compareVersions('5', '1.0')).to.equal(true);
      expect(Utils.compareVersions('5.0', '1')).to.equal(true);
      expect(Utils.compareVersions('5', '1')).to.equal(true);
    });

    it('returns false for earlier updates', () => {
        expect(Utils.compareVersions('1.5.0', '1.5.2')).to.equal(false);
        expect(Utils.compareVersions('1.5', '2.0')).to.equal(false);
        expect(Utils.compareVersions('1.5.2', '2.0')).to.equal(false);
        expect(Utils.compareVersions('1.0', '5.0.6.2')).to.equal(false);
        expect(Utils.compareVersions('1.0', '5')).to.equal(false);
        expect(Utils.compareVersions('1', '5.0')).to.equal(false);
        expect(Utils.compareVersions('1', '5')).to.equal(false);
    });

    it('returns false for the same update', () => {
        expect(Utils.compareVersions('1.5.0', '1.5.0')).to.equal(false);
        expect(Utils.compareVersions('1.5', '1.5')).to.equal(false);
        expect(Utils.compareVersions('1', '1')).to.equal(false);
        expect(Utils.compareVersions('5', '5')).to.equal(false);
    });

  });

});