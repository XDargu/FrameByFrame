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

  describe('filterText', () => {

    it('finds "st" in "test"', () => {
      const filter = "st";
      const content = "test";
      const result = Utils.filterText(filter, content);
      expect(result).to.equal(true);
    });

    it('does not find "a" in "test"', () => {
      const filter = "a";
      const content = "test";
      const result = Utils.filterText(filter, content);
      expect(result).to.equal(false);
    });
  });

});