import { expect } from 'chai';
import * as Recording from "../recording/RecordingData"
import * as Utils from "../utils/utils"

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

            const firstEntityId = Utils.toUniqueID(0, 1);

            const entity = frameData.entities[firstEntityId];
            expect(entity).to.not.be.undefined;

            const name = Recording.NaiveRecordedData.getEntityName(entity);

            expect(name).to.equal("My Entity Name 1");
        });

        it('gets entity position', () => {

            const firstEntityId = Utils.toUniqueID(0, 1);

            const entity = frameData.entities[firstEntityId];
            expect(entity).to.not.be.undefined;

            const position = Recording.NaiveRecordedData.getEntityPosition(entity);

            expect(position).to.not.be.undefined;

            expect(position).to.have.property("x");
            expect(position).to.have.property("y");
            expect(position).to.have.property("z");
        });

        it('gets entity up', () => {

            const firstEntityId = Utils.toUniqueID(0, 1);

            const entity = frameData.entities[firstEntityId];
            expect(entity).to.not.be.undefined;

            const up = Recording.NaiveRecordedData.getEntityUp(entity);

            expect(up).to.not.be.undefined;

            expect(up).to.have.property("x");
            expect(up).to.have.property("y");
            expect(up).to.have.property("z");
        });

        it('gets entity forward', () => {

            const firstEntityId = Utils.toUniqueID(0, 1);

            const entity = frameData.entities[firstEntityId];
            expect(entity).to.not.be.undefined;

            const forward = Recording.NaiveRecordedData.getEntityForward(entity);

            expect(forward).to.not.be.undefined;

            expect(forward).to.have.property("x");
            expect(forward).to.have.property("y");
            expect(forward).to.have.property("z");
        });
    });

    describe('NaiveRecordingData version 1', () => {

        it('correctly converts to latest version', () => {

            const version = 1;
            let dataV1 = new Recording.NaiveRecordedData();
            dataV1.addTestData(100, 15, version);

            dataV1.patch(version);

            expect(dataV1.scenes).to.not.be.undefined;

            const frameData = dataV1.buildFrameData(0);
            const firstEntityId = Utils.toUniqueID(0, 1);

            const entity = frameData.entities[firstEntityId];

            const forward = Recording.NaiveRecordedData.getEntityForward(entity);
            const up = Recording.NaiveRecordedData.getEntityUp(entity);

            expect(forward).to.not.be.undefined;
            expect(up).to.not.be.undefined;
        });

    });

    describe('NaiveRecordingData version 2', () => {

        it('correctly converts to latest version', () => {

            const version = 2;
            let dataV1 = new Recording.NaiveRecordedData();
            dataV1.addTestData(100, 15, version);

            dataV1.patch(version);

            expect(dataV1.scenes).to.not.be.undefined;
        });
    });
});
