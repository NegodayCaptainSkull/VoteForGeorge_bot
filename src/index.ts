import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Bot('7853001252:AAFK9iSa39ml-2iuZcCGvOjI_NAPYpy7MPk'!);
const candidateChatId = '1151742630';

enum UserState {
  NONE = 'NONE',
  AWAITING_SUGGESTION = 'AWAITING_SUGGESTION',
  AWAITING_JOIN_REQUEST = 'AWAITING_JOIN_REQUEST'
}

const userStates = new Map<number, UserState>();

const candidateInfo = `
Привет! Я Гоша Мкртчян, кандидат на пост директора в День дублёра. 
Моя цель – сделать школьную жизнь интереснее и комфортнее!
`;

// Главная команда /start с клавиатурой кнопок
bot.command('start', async (ctx) => {
  await ctx.reply(
    'Добро пожаловать! Выберите опцию ниже:',
    {
      reply_markup: new Keyboard()
        .text('О кандидате')
        .row()
        .text('Сделать предложение')
        .row()
        .text('Вступить в команду')
        .row()
        .text('Мини-игра')
    }
  );
});

// Обработчик кнопки "О кандидате"
bot.hears('О кандидате', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.NONE);
  await ctx.reply(candidateInfo);
});

// Обработчик кнопки "Сделать предложение"
bot.hears('Сделать предложение', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.AWAITING_SUGGESTION);
  await ctx.reply('Отправьте ваше предложение, и я его получу!');
});

// Обработчик кнопки "Вступить в команду"
bot.hears('Вступить в команду', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.AWAITING_JOIN_REQUEST);
  await ctx.reply('Отправьте, пожалуйста, сообщение о том, как вы хотите помочь в кампании!');
});

bot.hears('Мини-игра', async (ctx) => {
  await ctx.reply(
    'Добро пожаловать в SchoolCoin кликер! Нажмите кнопку ниже, чтобы открыть игру:',
    {
      reply_markup: new InlineKeyboard().webApp(
        'Открыть игру',
        'https://vote-for-george.vercel.app/' // Ссылка на ваше Web App
      ),
    }
  );
})

// Обработчик текста от пользователя
bot.on('message:text', async (ctx) => {
  const state = userStates.get(ctx.from!.id) || UserState.NONE;

  if (state === UserState.AWAITING_SUGGESTION) {
    await bot.api.forwardMessage(candidateChatId, ctx.chat.id, ctx.message.message_id);
    await ctx.reply('Спасибо за ваше предложение! Я получил ваше сообщение.');
    userStates.set(ctx.from!.id, UserState.NONE);
  } else if (state === UserState.AWAITING_JOIN_REQUEST) {
    await bot.api.forwardMessage(candidateChatId, ctx.chat.id, ctx.message.message_id);
    await ctx.reply('Спасибо, что хотите помочь! Ваше сообщение отправлено.');
    userStates.set(ctx.from!.id, UserState.NONE);
  } else {
    await ctx.reply('Пожалуйста, выберите опцию из меню, чтобы продолжить.');
  }
});

// Запуск бота
bot.start();
