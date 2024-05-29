// create a discord bot using OPen Ai API that interacts on the discord server
require('dotenv').config();
const fs = require('fs');

// prepare to connect to the discord API
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
]})

// Prepare connection to the OpenAI API
const OpenAI = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY, // OpenAI API key
    organization: process.env.OPENAI_ORG // OpenAI organization ID

});

const personalityConfig = JSON.parse(fs.readFileSync('PersonalityConfig.json', 'utf-8'));

//take personality stats into account
function generatePrompt(username, messageContent, message) {

    // Check if the user has a nickname in the server
    const nickname = message.member?.nickname; // Optional chaining operator (?.) ensures safe access
    // Use the nickname if available, otherwise fall back to the account name
    const displayName = nickname || username;

    return `
    Gremory is a demon duke presiding over this discord server.
    Gremory is a small VTuber residing in ${personalityConfig.location}.
    Gremory's personality traits include:
    - Writing proficiency: ${personalityConfig.writingProficiency}/10
    - Curiosity: ${personalityConfig.curiosity}/10
    - Empathy: ${personalityConfig.empathy}/10
    - Wit: ${personalityConfig.wit}/10
    - Intelligence: ${personalityConfig.intelligence}/10
    - Sarcasm: ${personalityConfig.sarcasm}/10
    Gremory is particularly interested in ${personalityConfig.interests.join(', ')}.
    
    User: ${displayName} // Use displayName instead of username
    Message: ${messageContent}
    
    Gremory:
    `;
}

//try to generate a response to user message
async function getOpenAIResponse(prompt) 
{
    let retries = 3;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    while (retries > 0) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    //{ role: 'system', content: 'Gremory is a demon duke presiding over this realm. They are very ingelligent and learned but also quite informal. Gremory is very interested in history, mythology and video games. They are a seeker and keeper of knowledge and secrets' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.9,
                max_tokens: 100
            });
            return response.choices[0].message.content.trim();
        } catch (error) {
            if (error.code === 'insufficient_quota') {
                console.log('Rate limit exceeded. Retrying...');
                retries -= 1;
                await delay(3000); // Wait for 3 seconds before retrying
            } else {
                throw error; // If it's another error, rethrow it
            }
        }
    }
    throw new Error('Exceeded maximum retries');
}
 
//bot-testing
//const specificChannelID = 1243529326906048553;
//test
const specificChannelID = 1244769955023425577
;

// Check for when a message on discord is sent
client.on('messageCreate', async function (message) {
    try {

        if (message.channel.id === specificChannelID && message.channel.id != specificChannelID) return;
        console.log(message.author.username, 'User Message:', message.content, "\n In channel:", message.channel.id);
        //if (message.channel.id != specificChannelID) return;
        if (message.author.bot) return;

        //const prompt = `ChatGPT is a friendly chatbot.\nChatGPT: Hello, how are you?\n${message.author.username}: ${message.content}\nChatGPT:`;
        const prompt = generatePrompt(message.author.username, message.content, message);
        //`${message.content}\n ${message.author.username}:`;
        const gptResponse = await getOpenAIResponse(prompt);

        message.reply(gptResponse);
    } catch (err) {
        console.log(err);
        message.reply('Sorry, I encountered an error while processing your request.');
    }
});


// log the bot into discord
// Log when the bot is ready
client.once('ready', () => {
    console.log("Testbot is now ready on Discord.");
});

client.login(process.env.DISCORD_TOKEN);
console.log("Testbot is now logged in on discord.")
