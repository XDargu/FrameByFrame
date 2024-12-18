import { expect } from 'chai';
import * as Recording from "../recording/RecordingData"
import { CommentsData } from '../frontend/Comments';

describe('Comments', () => {

    var commentsData: CommentsData;

    beforeEach(function() {
        commentsData = new CommentsData();
    });

    it('new IDs are generated correctly', () => {

        commentsData.setComments({});
        const propCom1 = commentsData.addPropertyComment(1, 5, 7, { x: 100, y: 200 });
        const propCom2 = commentsData.addPropertyComment(2, 5, 7, { x: 100, y: 200 });
        expect(propCom1.id).to.equal(1);
        expect(propCom2.id).to.equal(2);
    });

    it('new IDs are generated correctly when loading comments', () => {

        commentsData.setComments({
            5: {
                id: 5,
                type: Recording.ECommentType.Timeline,
                text: "Test",
                pos: { x: 100, y: 200 },
                frameId: 2,
            },
            6: {
                id: 6,
                type: Recording.ECommentType.Timeline,
                text: "Test",
                pos: { x: 100, y: 200 },
                frameId: 2,
            }
        });

        const propCom1 = commentsData.addPropertyComment(1, 5, 7, { x: 100, y: 200 });
        const propCom2 = commentsData.addPropertyComment(2, 5, 7, { x: 100, y: 200 });
        expect(propCom1.id).to.equal(7);
        expect(propCom2.id).to.equal(8);
    });

    it('new IDs are generated correctly after deletion', () => {

        commentsData.setComments({});
        const propCom1 = commentsData.addPropertyComment(1, 5, 7, { x: 100, y: 200 });
        commentsData.deleteComment(propCom1.id);
        const propCom2 = commentsData.addPropertyComment(2, 5, 7, { x: 100, y: 200 });
        expect(propCom2.id).to.equal(2);
    });
});