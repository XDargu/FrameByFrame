import { expect } from 'chai';
import * as Filters from "../filters/filters"
import * as Recording from "../recording/RecordingData"

describe('Filters', () => {

    const entities = 12;
    const frames = 50;
    var data: Recording.NaiveRecordedData;

    let areResultsEqual = function(result1: Filters.FilteredResult, result2: Filters.FilteredResult) {
        return result1.entityId == result2.entityId &&
            result1.frameIdx == result2.frameIdx &&
            result1.name == result2.name;
    };

    let areResultArraysEqual = function(results1: Filters.FilteredResult[], results2: Filters.FilteredResult[]) {
        if (results1.length != results2.length)
            return false;

        for (let i=0; i<results1.length; ++i)
        {
            if (!areResultsEqual(results1[i], results2[i]))
                return false;
        }

        return true;
    };

    beforeEach(function() {
        data = new Recording.NaiveRecordedData();
        // Test data creates 1 event per entity per frame
        // Half will be named OnTestEvent with tag FirstTest
        // Te other half will be named OnOtherTestEvent with tag OtherTest
        data.addTestData(frames, entities);
    });

    describe('Event Filters', () => {

        it('Finds all events with no data', () => {

            let eventFilter = new Filters.EventFilter("", "", []);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });

        it('Finds events by exact tag', () => {

            let eventFilter1 = new Filters.EventFilter("", "FirstTest", []);
            let eventFilter2 = new Filters.EventFilter("", "OtherTest", []);
            const result1 = eventFilter1.filter(data);
            const result2 = eventFilter2.filter(data);
            expect(result1.length).to.equal(frames * entities * 0.5);
            expect(result2.length).to.equal(frames * entities * 0.5);
        });

        it('Finds events with by tag included in the filter', () => {

            let eventFilter = new Filters.EventFilter("", "Test", []);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });

        it('Doesn´t find events with incorrect tag', () => {

            let eventFilter = new Filters.EventFilter("", "Invalid", []);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(0);
        });

        it('Finds events by exact name', () => {

            let eventFilter1 = new Filters.EventFilter("OnTestEvent", "", []);
            let eventFilter2 = new Filters.EventFilter("OnOtherTestEvent", "", []);
            const result1 = eventFilter1.filter(data);
            const result2 = eventFilter2.filter(data);
            expect(result1.length).to.equal(frames * entities * 0.5);
            expect(result2.length).to.equal(frames * entities * 0.5);
        });

        it('Doesn´t find events with incorrect nane', () => {

            let eventFilter = new Filters.EventFilter("Invalid", "", []);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(0);
        });

        it('Finds events with by name included in the filter', () => {

            let eventFilter = new Filters.EventFilter("TestEvent", "", []);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });
        
        it('Finds events with string property with exact value', () => {

            let property: Filters.MemberFilter = {
                name: "Test string",
                type: Filters.MemberFilterType.String, 
                mode: Filters.FilterMode.Equals,
                value: "eventProp0"
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(entities);
        });

        it('Finds events with string property that contains value', () => {

            let property: Filters.MemberFilter = {
                name: "Test string",
                type: Filters.MemberFilterType.String, 
                mode: Filters.FilterMode.Contains,
                value: "eventProp"
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * entities * 0.5);
        });

        it('Finds events with string property that differs value', () => {

            let property: Filters.MemberFilter = {
                name: "Test string",
                type: Filters.MemberFilterType.String, 
                mode: Filters.FilterMode.Different,
                value: "eventProp0"
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * entities * 0.5 - entities);
        });

        it('Finds events with number property with exact value', () => {

            let property: Filters.MemberFilter = {
                name: "Test number",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.Equals,
                value: 4
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * 0.5);
        });

        it('Finds events with number property that differs value', () => {

            let property: Filters.MemberFilter = {
                name: "Test number",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.Different,
                value: 4
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * entities * 0.5 - frames * 0.5);
        });

        it('Finds events with number property bigger than value', () => {

            let property: Filters.MemberFilter = {
                name: "Test number",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.More,
                value: entities * 0.5
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * 0.5 * (entities * 0.5 - 1));
        });

        it('Finds events with number property smaller than value', () => {

            let property: Filters.MemberFilter = {
                name: "Test number",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.Less,
                value: entities * 0.5
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * 0.5 * entities * 0.5);
        });

        it('Finds events with included number property with exact value', () => {

            let property: Filters.MemberFilter = {
                name: "number",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.Equals,
                value: 4
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames);
        });

        it('Finds events with boolean property with exact value', () => {

            let property: Filters.MemberFilter = {
                name: "Test boolean",
                type: Filters.MemberFilterType.Boolean, 
                mode: Filters.FilterMode.Equals,
                value: true
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * 0.5 * entities * 0.5);
        });

        it('Finds events with boolean property with different value', () => {

            let property: Filters.MemberFilter = {
                name: "Test boolean",
                type: Filters.MemberFilterType.Boolean, 
                mode: Filters.FilterMode.Different,
                value: true
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(frames * 0.5 * entities * 0.5);
        });

        it('Doesn´t find events with invalid string properties', () => {

            let property: Filters.MemberFilter = {
                name: "Invalid",
                type: Filters.MemberFilterType.String, 
                mode: Filters.FilterMode.Contains,
                value: ""
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(0);
        });

        it('Doesn´t find events with invalid number properties', () => {

            let property: Filters.MemberFilter = {
                name: "Invalid",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.Equals,
                value: 0
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);
            expect(result.length).to.equal(0);
        });

        it('Finds the same data after exporting and importing', () => {

            let property: Filters.MemberFilter = {
                name: "Test number",
                type: Filters.MemberFilterType.Number, 
                mode: Filters.FilterMode.Less,
                value: entities * 0.5
            };
            let eventFilter = new Filters.EventFilter("", "", [property]);
            const result = eventFilter.filter(data);

            const exportedFilter = eventFilter.export();
            let importedFilter = new Filters.EventFilter("", "", []);
            importedFilter.import(exportedFilter);
            const resultImported = importedFilter.filter(data);

            expect(areResultArraysEqual(result, resultImported)).to.be.true;
        });
    });

    describe('Property Filters', () => {

        it('Finds all properties with no data', () => {

            let propertyFilter = new Filters.PropertyFilter("", []);
            const result = propertyFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });

        it('Finds properties by exact group', () => {

            let propertyFilter = new Filters.PropertyFilter("Target Info", []);
            const result = propertyFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });

        it('Finds properties with by group included in the filter', () => {

            let propertyFilter = new Filters.PropertyFilter("Target", []);
            const result = propertyFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });

        it('Doesn´t find properties with incorrect group', () => {

            let propertyFilter = new Filters.PropertyFilter("Invalid", []);
            const result = propertyFilter.filter(data);
            expect(result.length).to.equal(0);
        });

        it('Finds properties by special basic information group', () => {

            let propertyFilter = new Filters.PropertyFilter("Basic Information", []);
            const result = propertyFilter.filter(data);
            expect(result.length).to.equal(frames * entities);
        });

        it('Finds the same data after exporting and importing', () => {

            let propertyFilter = new Filters.PropertyFilter("Basic Information", []);
            const result = propertyFilter.filter(data);

            const exportedFilter = propertyFilter.export();
            let importedFilter = new Filters.PropertyFilter("", []);
            importedFilter.import(exportedFilter);
            const resultImported = importedFilter.filter(data);
            
            expect(areResultArraysEqual(result, resultImported)).to.be.true;
        });
    });
});