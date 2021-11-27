import { expect } from 'chai';
import * as Recording from "../recording/RecordingData"

describe('RecordingData', () => {

    var data: Recording.NaiveRecordedData;

    beforeEach(function() {
        data = new Recording.NaiveRecordedData();
        data.addTestData(100, 15);
    });

    describe('NaiveRecordingData', () => {

        it('returns correct frame size', () => {

            const result = data.getSize();
            expect(result).to.equal(100);
        });

        it('returns correct size when cleared', () => {

            data.clear();
            const result = data.getSize();
            expect(result).to.equal(0);
        });

    });

    describe('NaiveRecordingData and FrameData', () => {

        var frameData: Recording.IFrameData;

        beforeEach(function() {
            frameData = data.buildFrameData(0);
        });

        it('builds frame data', () => {

            expect(frameData).to.not.be.undefined;
            expect(frameData.entities).to.not.be.undefined;
        });

        it('gets correct entity name', () => {

            const firstEntityId = 1;

            const entity = frameData.entities[firstEntityId];
            expect(entity).to.not.be.undefined;

            const name = Recording.NaiveRecordedData.getEntityName(entity);

            expect(name).to.equal("My Entity Name 1");
        });

        it('gets entity position', () => {

            const firstEntityId = 1;

            const entity = frameData.entities[firstEntityId];
            expect(entity).to.not.be.undefined;

            const position = Recording.NaiveRecordedData.getEntityPosition(entity);

            expect(position).to.not.be.undefined;

            expect(position).to.have.property("x");
            expect(position).to.have.property("y");
            expect(position).to.have.property("z");
        });
    });
});
