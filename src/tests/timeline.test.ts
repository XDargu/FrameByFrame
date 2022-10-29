import { expect } from 'chai';
import * as Timeline from "../timeline/timeline"
import * as Utils from "../utils/utils"

describe('Timeline', () => {

    describe('Events', () => {

        it('returns correctly an event by id', () => {
            let data = new Timeline.TimelineData();
            data.events.addEvent(12, "123", 5, "#c4ff46", "test", 0);
            
            let event = data.events.getEvent(12);
            expect(event.id).to.equal(12);
            expect(event.frame).to.equal(5);
            expect(event.label).to.equal("test");
            expect(event.typeId).to.equal(0);
        });

        it('events are properly cleared', () => {
            let data = new Timeline.TimelineData();
            data.events.addEvent(1, "123", 5, "#c4ff46", "test", 0);
            data.events.addEvent(2, "456", 2, "#aaaaaa", "test", 0);
            data.events.addEvent(3, "789", 2, "#c4ff46", "test", 0);
            
            data.events.clear();

            expect(data.events.getEvent(1)).to.be.undefined;
            expect(data.events.getEvent(2)).to.be.undefined;
            expect(data.events.getEventsInFrame(2)).to.be.undefined;
        });

        it('returns the correct amount of events per frame', () => {
            let data = new Timeline.TimelineData();
            data.events.addEvent(1, "123", 5, "#c4ff46", "test", 0);
            data.events.addEvent(2, "456", 2, "#aaaaaa", "test", 0);
            data.events.addEvent(3, "789", 2, "#c4ff46", "test", 0);
            
            expect(data.events.getEventsInFrame(5).length).to.equal(1);
            expect(data.events.getEventsInFrame(2).length).to.equal(2);
            expect(data.events.getEventsInFrame(10)).to.be.undefined;
        });

        it('groups event by frame correctly', () => {
            let data = new Timeline.TimelineData();
            data.events.addEvent(1, "123", 5, "#c4ff46", "test", 0);
            data.events.addEvent(2, "456", 2, "#aaaaaa", "test", 0);
            data.events.addEvent(3, "789", 2, "#c4ff46", "test", 0);

            let events = data.events.getEventsInFrame(2);
            
            expect(events.length).to.equal(2);
            expect(events[0].id).to.equal(2);
            expect(events[1].id).to.equal(3);
        });

        it('returns the correct amount of event colors', () => {
            let data = new Timeline.TimelineData();

            expect(data.events.getEventColorAmount()).to.equal(0);
            
            data.events.addEvent(1, "123", 5, "#c4ff46", "test", 0);
            
            expect(data.events.getEventColorAmount()).to.equal(1);

            data.events.addEvent(2, "456", 2, "#aaaaaa", "test", 0);
            data.events.addEvent(3, "789", 2, "#c4ff46", "test", 0);

            expect(data.events.getEventColorAmount()).to.equal(2);
        });

        it('colors are registered in the right order', () => {
            let data = new Timeline.TimelineData();

            data.events.addEvent(1, "123", 5, "#c4ff46", "test", 0);
            data.events.addEvent(2, "456", 2, "#aaaaaa", "test", 0);
            data.events.addEvent(3, "789", 2, "#c4ff46", "test", 0);

            expect(data.events.getEventColorByIndex(0)).to.equal("#c4ff46");
            expect(data.events.getEventColorByIndex(1)).to.equal("#aaaaaa");
        });

        it('frames are visited only once', () => {
            let data = new Timeline.TimelineData();

            data.events.addEvent(1, "123", 5, "#c4ff46", "test", 0);
            data.events.addEvent(2, "456", 2, "#aaaaaa", "test", 0);
            data.events.addEvent(3, "789", 2, "#c4ff46", "test", 0);

            let visitedFrames : number[] = [];
            data.events.visitEventsPerFrame((events, frame)=> {
                visitedFrames.push(frame);
            });

            expect(visitedFrames).contains(5);
            expect(visitedFrames).contains(2);
            expect(visitedFrames.length).to.equal(2);
        });
    });

    describe('Markers', () => {

        it('returns the right amount of markers', () => {
            let data = new Timeline.TimelineData();

            expect(data.markers.getMarkerAmount()).to.equal(0);

            data.markers.addMarker("test", 2, "#aaaaaa");

            expect(data.markers.getMarkerAmount()).to.equal(1);

            data.markers.addMarker("test2", 7, "#aaaaaa");

            expect(data.markers.getMarkerAmount()).to.equal(2);
        });

        it('clears markers correctly', () => {
            let data = new Timeline.TimelineData();

            data.markers.addMarker("test", 2, "#aaaaaa");
            data.markers.addMarker("test2", 7, "#aaaaaa");
            data.markers.clear();

            expect(data.markers.getMarkerAmount()).to.equal(0);
        });

        it('adds markers correctly', () => {
            let data = new Timeline.TimelineData();

            expect(data.markers.getMarkerByIndex(0)).to.be.undefined;

            data.markers.addMarker("test", 2, "#aaaaaa");
            data.markers.addMarker("test2", 7, "#aaaaaa");

            expect(data.markers.getMarkerByIndex(0).frame).to.equal(2);
            expect(data.markers.getMarkerByIndex(0).name).to.equal("test");

            expect(data.markers.getMarkerByIndex(1).frame).to.equal(7);
            expect(data.markers.getMarkerByIndex(1).name).to.equal("test2");
        });
    });
});
