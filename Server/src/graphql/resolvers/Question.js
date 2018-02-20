import FormatErrors from '../../FormatErrors';
import User from '../../models/User';
import Question from '../../models/Question';
import LikeQuestion from '../../models/LikeQuestion';

import { requireUser } from '../../services/auth';
import { pubsub } from '../../config/pubsub';

export const QUESTION_LIKED = 'questionLiked';
export const QUESTION_SENDED = 'questionSended';

export default {
  Question: {
    theAsker: ({ theAsker }) => User.findById(theAsker),
    // theResponder: ({ theResponder }) => theResponder.map(r => User.findById(r)),
    theResponder: ({ theResponder }) => User.findById(theResponder),
    // likes: ({ likes }) => likes.map(l => User.findById(l)),
  },
  Query: {
    getQuestions: async (_, args, { user }) => {
      try {
        await requireUser(user);
        const p1 = Question.find({ answer: { $exists: true } }).sort({ createdAt: -1 });
        const p2 = LikeQuestion.findOne({ userId: user._id });
        const [questions, likes] = await Promise.all([p1, p2]);
        const QuestionsToSend = questions.reduce((arr, question) => {
          const qs = question.toJSON();
          if (likes.questions.some(q => q.equals(question._id))) {
            arr.push({
              ...qs,
              isLiked: true,
            });
          } else {
            arr.push({
              ...qs,
              isLiked: false,
            });
          }
          return arr;
        }, []);

        return QuestionsToSend;
      } catch (error) {
        throw error;
      }
    },
    getMyNotAnswerdQuestions: async (_, args, { user }) => {
      try {
        const questions = await Question.find()
          .exists('answer', false)
          .where('theResponder', user._id)
          .sort({ createdAt: -1 });
        return questions;
      } catch (error) {
        throw error;
      }
    },
  },

  Mutation: {
    sendQuestion: async (_, args, { user }) => {
      try {
        await requireUser(user);

        const question = await Question.create({
          ...args,
          theAsker: user._id,
        });

        pubsub.publish(QUESTION_SENDED, { [QUESTION_SENDED]: { ...question } });

        return {
          question,
          errors: null,
        };
      } catch (error) {
        return {
          question: null,
          errors: FormatErrors(error),
        };
      }
    },
    AnswerQuestion: async (_, { answer, questionID }, { user }) => {
      try {
        await requireUser(user);
        const { theResponder, answer: qAnswer } = await Question.findById(questionID);

        if (theResponder.toString() !== user._id.toString()) {
          throw Error;
        }

        if (qAnswer) {
          throw Error;
        }

        const updatedQuestion = await Question.findByIdAndUpdate(questionID, {
          answer,
          answerDate: new Date().getTime(),
        });
        return {
          question: updatedQuestion,
          errors: null,
        };
      } catch (error) {
        return {
          question: null,
          errors: FormatErrors(error),
        };
      }
    },
    likeQuestionToggle: async (_, { questionID }, { user }) => {
      try {
        await requireUser(user);
        const likes = await LikeQuestion.findOne({ userId: user._id });

        const question = await likes.userLikedQuestion(questionID);

        return {
          question,
        };
      } catch (error) {
        return {
          errors: FormatErrors(error),
        };
      }
    },
    sendQuestionForNearby: async (_, { text }, { user }) => {
      try {
        const currentUser = await requireUser(user);
        if (!currentUser) {
          throw Error;
        }
        const { loc: { coordinates } } = currentUser;

        const users = await User.where('loc').nearSphere({
          center: coordinates,
          maxDistance: 1 / 111.12,
        });

        const allUsers = users.filter(u => u._id.toString() !== user._id.toString());
        const questions = [];
        allUsers.map(u =>
          questions.push(Question.create({ theAsker: user._id, text, theResponder: u })));

        return Promise.all(questions);
      } catch (error) {
        throw error;
      }
    },
  },
  Subscription: {
    questionLiked: {
      subscribe: () => pubsub.asyncIterator(QUESTION_LIKED),
    },
    questionSended: {
      subscribe: () => pubsub.asyncIterator(QUESTION_SENDED),
    },
  },
};
