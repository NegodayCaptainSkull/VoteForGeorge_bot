import { Bot, InlineKeyboard, Keyboard, webhookCallback } from 'grammy';
import * as dotenv from 'dotenv';
import express, { response } from 'express';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDHWa8wMR2oXJkI5C8IxYLI8Z050ZKJT-M",
  authDomain: "vote-for-george.firebaseapp.com",
  databaseURL: "https://vote-for-george-default-rtdb.firebaseio.com",
  projectId: "vote-for-george",
  storageBucket: "vote-for-george.firebasestorage.app",
  messagingSenderId: "284314274130",
  appId: "1:284314274130:web:da18f438da4b09b9df528b"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);


dotenv.config();

const TOKEN = '7853001252:AAFK9iSa39ml-2iuZcCGvOjI_NAPYpy7MPk'
const bot = new Bot(TOKEN);
const candidateChatId = '1151742630';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(`/${TOKEN}`, webhookCallback(bot, 'express'));

enum UserState {
  NONE = 'NONE',
  AWAITING_SUGGESTION = 'AWAITING_SUGGESTION',
  AWAITING_JOIN_REQUEST = 'AWAITING_JOIN_REQUEST',
  AWAITING_MUSIC = 'AWAITING_MUSIC'
}

const userStates = new Map<number, UserState>();

const candidateInfo = `
🏫 Привет, друзья! Я — Гоша Мкртчян, и я претендую на роль директора лицея на День дублера! 🚀

Почему именно я? Потому что я не просто кандидат, я человек, который сделает этот день действительно незабываемым! 🎉

🔑 <b>Мои преимущества:</b>

<b>1. Интерактив: В этом году ко Дню дублера у нас появится новая игра School Coin, где каждый сможет заработать виртуальные коины. Это не просто игра — это шанс проявить себя и побороться за крутые призы, которые получат самые активные участники!</b> 🎮💰

<b>2. Командная работа: Я открыт для ваших идей и всегда готов поддержать, обсудить и реализовать самые крутые предложения от учеников.</b>

<b>3. Яркие идеи и вдохновение: Я хочу, чтобы День дублера стал незабываемым событием, полным интересных активностей, креативных идей и приятных сюрпризов. Каждый ученик почувствует атмосферу праздника и станет частью чего-то особенного!</b> ✨

🎯 <b>Что делать?</b>

<b>1. Голосуйте за меня, Гошу Мкртчяна, на День дублера!</b>
<b>2. Зарабатывайте коины в игре и готовьтесь к наградам!</b> (Раздача призов будет только в случае победы кандидата)

💡 
<blockquote>Голосуй за Георгия Мкртчяна — и сделай День дублера не просто днем, а настоящим праздником!</blockquote>
💪
`;

// Проверяем, является ли пользователь новым
async function checkIfNewUser(userId: number) {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);
  return !snapshot.exists(); // Если пользователь не существует, возвращаем true
}

// Регистрация нового пользователя
async function registerNewUser(userId: number, referrerId: string | null) {
  const userRef = ref(db, `users/${userId}`);

  // Сохраняем данные нового пользователя
  await set(userRef, {
    id: userId,
    referrer: referrerId || null,
    referrals: {}, // Пустой объект для рефералов
  });

  // Если есть реферер, обновляем его данные
  if (referrerId) {
    const referrerRef = ref(db, `users/${referrerId}`);
    const snapshot = await get(referrerRef);

    if (snapshot.exists()) {
      const referrerData = snapshot.val();
      const updatedReferrals = referrerData.referrals || {};

      // Добавляем нового реферала в объект, изначально с 0 монет
      updatedReferrals[userId] = 0;

      await update(referrerRef, {
        referrals: updatedReferrals,
      });
    }
  }
}

const getUserTag = async (userId: string | number) => {
  try {
    // Преобразуем userId в строку, если это число
    const chat = await bot.api.getChat(userId.toString());
    const name = chat.username
      ? `@${chat.username}` // Если у пользователя есть username, используем его
      : chat.first_name; // Иначе используем имя
    
    return name;
  } catch (error) {
    console.error('Ошибка при получении информации о пользователе:', error);
    return 'неизвестный пользователь'; // Возвращаем placeholder в случае ошибки
  }
};

// Главная команда /start с клавиатурой кнопок
bot.command('start', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const referrerId = args[1]; // ID реферера из параметра start
  const userId = ctx.from!.id;

  // Проверяем, если пользователь новый
  const isNewUser = await checkIfNewUser(userId);

  if (isNewUser) {
    if (referrerId) {
      // Сохраняем реферера и пользователя
      await registerNewUser(userId, referrerId);

      await ctx.reply(
        `Привет! Вы были приглашены пользователем ${getUserTag(referrerId)}. Спасибо за присоединение!`
      );

      // Уведомляем реферера
      try {
        await bot.api.sendMessage(
          referrerId,
          `🎉 У вас новый реферал! Пользователь ${getUserTag(userId)} присоединился по вашей ссылке.`
        );
      } catch (error) {
        console.error('Ошибка при уведомлении реферера:', error);
      }
    } else {
      await ctx.reply('Привет! Добро пожаловать в бота.');
    }

    // Зарегистрировать нового пользователя
    await registerNewUser(userId, referrerId);
  } else {
    await ctx.reply('Добро пожаловать обратно!');
  }

  // Вывести главное меню
  await ctx.reply(
    'Выберите опцию ниже:',
    {
      reply_markup: new Keyboard()
        .text('О кандидате 👤')
        .row()
        .text('Сделать предложение 💬')
        .row()
        .text('Вступить в команду 😇')
        .row()
        .text('Отправить музыку 🎵')
        .row()
        .text('Мини-игра 🎮'),
    }
  );
});


// Обработчик кнопки "О кандидате"
bot.hears('О кандидате 👤', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.NONE);
  await ctx.reply(candidateInfo, { parse_mode: 'HTML'});
});

// Обработчик кнопки "Сделать предложение"
bot.hears('Сделать предложение 💬', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.AWAITING_SUGGESTION);
  await ctx.reply('💡 У тебя есть классная идея, как сделать День дублера ещё лучше? Напиши её прямо сюда, и я обязательно её рассмотрю! Вместе мы сделаем этот день ярким и запоминающимся. 😉 Если у тебя есть замечания по моей работе или работе бота можешь также написать сюда. 😁');
});

// Обработчик кнопки "Вступить в команду"
bot.hears('Вступить в команду 😇', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.AWAITING_JOIN_REQUEST);
  await ctx.reply('🌟 Спасибо за желание присоединиться к моей команде! Напиши, как ты хочешь помочь, и мы обязательно свяжемся, чтобы обсудить, как вместе сделать День дублера потрясающим! 🙌');
});

bot.hears('Отправить музыку 🎵', async (ctx) => {
  userStates.set(ctx.from!.id, UserState.AWAITING_MUSIC);
  await ctx.reply('🎶 Отлично! Отправь мне трек, который ты хочешь услышать на День дублера. Жду твою музыку! 🎧');
});

bot.hears('Мини-игра 🎮', async (ctx) => {
  const { first_name, username, id } = ctx.from!;
  const webAppUrl = `https://vote-for-george.vercel.app/?name=${encodeURIComponent(
    first_name
  )}&username=${encodeURIComponent(username || '')}&id=${id}`;

  await ctx.reply(
    'Добро пожаловать в SchoolCoin кликер! Нажмите кнопку ниже, чтобы открыть игру:',
    {
      reply_markup: new InlineKeyboard().webApp('Открыть игру', webAppUrl),
    }
  );
})

// Обработчик текста от пользователя
bot.on('message', async (ctx) => {
  const state = userStates.get(ctx.from!.id) || UserState.NONE;

  const replyToMessage = ctx.message?.reply_to_message;

  if (ctx.chat.id.toString() === candidateChatId && replyToMessage) {
    userStates.set(ctx.chat.id, UserState.NONE)
    const forwardedMessage = replyToMessage as unknown as { forward_from?: { id: number; username?: string; first_name?: string; is_bot?: boolean } };

    if (forwardedMessage.forward_from && !forwardedMessage.forward_from.is_bot) {
      const userId = forwardedMessage.forward_from.id; // ID пользователя, который изначально отправил сообщение
      const userTag = `@${forwardedMessage.forward_from.username || forwardedMessage.forward_from.first_name || 'Пользователь'}`;
      const responseText = ctx.message?.text;

      try {
        await bot.api.sendMessage(userId, `📩 Ответ от Гоши Мкртчяна:\n\n${responseText}`);
        await ctx.reply(`✅ Ответ пользователю ${userTag} (ID: ${userId}) успешно отправлен.`);
      } catch (error) {
        console.error('Ошибка при отправке сообщения пользователю:', error);
        await ctx.reply(`❌ Не удалось отправить сообщение пользователю ${userTag} (ID: ${userId}).`);
      }
    }  else {
      await ctx.reply('❗ Вы отвечаете на сообщение, которое не переслано от пользователя. Пожалуйста, выберите правильное сообщение.');
    }
  } else if (state === UserState.AWAITING_SUGGESTION) {
    await bot.api.forwardMessage(candidateChatId, ctx.chat.id, ctx.message.message_id);
    await ctx.reply('🎉 Спасибо за твою идею! Я получил твоё сообщение и обязательно его рассмотрю. Вместе мы сделаем этот день незабываемым! 💪');
    userStates.set(ctx.from!.id, UserState.NONE);
  } else if (state === UserState.AWAITING_JOIN_REQUEST) {
    await bot.api.forwardMessage(candidateChatId, ctx.chat.id, ctx.message.message_id);
    await ctx.reply('🙌 Спасибо, что хочешь присоединиться к моей команде! Я получил твоё сообщение и скоро свяжусь с тобой, чтобы обсудить детали. Вместе мы добьёмся успеха! 🚀');
    userStates.set(ctx.from!.id, UserState.NONE);
  } else if (state === UserState.AWAITING_MUSIC) {
    await bot.api.forwardMessage(candidateChatId, ctx.chat.id, ctx.message.message_id); // Пересылаем файл в чат
    await ctx.reply('🎶 Крутой трек! Я получил твое предложение. Спасибо за музыку! 🎧');
  } else {
    await ctx.reply('Пожалуйста, выберите опцию из меню, чтобы продолжить.');
  }
});

// Запуск бота
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Установить URL вебхука
  const WEBHOOK_URL = `https://voteforgeorge-bot.onrender.com/${TOKEN}`; // Замените на Render URL
  await bot.api.setWebhook(WEBHOOK_URL);
});
