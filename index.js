// create a discord bot using OPen Ai API that interacts on the discord server
require('dotenv').config();
const fs = require('fs');

// TODO: Create user objects
// TODO: OpenAI Completions
// TODO: Map Truncation
// TODO: Output map to JSON/DB

// dev channel .env variables.

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

//reference the personality config file
const personalityConfig = JSON.parse(fs.readFileSync('PersonalityConfig.json', 'utf-8'));

// store coversation history
const conversationHistory = new Map();

//take personality stats into account

/**
 * 
 * @param {string} username 
 * @param {string[]} conversation 
 * @param {Message<boolean>} message 
 * @returns 
 * 
 */
function generatePrompt(username, conversation, message) {

    // Check if the user has a nickname in the server
    const nickname = message.member.nickname; // Optional chaining operator (?.) ensures safe access
    console.log(`nickname = ${message.member.nickname}`);
    // Use the nickname if available, otherwise fall back to the account name
    const displayName = conversation.length > 0 ? conversation[0]: username;

    const personalityDescription = `Gremory is a demon duke presiding over this discord server.
    Gremory is a small VTuber residing in ${personalityConfig.location}.
    `;

    const conversationMessages = conversation.map(({ role, content }) => `${role}: ${content}`).join('\n');
    return `${personalityDescription}\n${conversationMessages}\n${displayName}:`;
/*
 Gremory's personality traits include:
    - Writing proficiency: ${personalityConfig.writingProficiency}/10
    - Curiosity: ${personalityConfig.curiosity}/10
    - Empathy: ${personalityConfig.empathy}/10
    - Wit: ${personalityConfig.wit}/10
    - Intelligence: ${personalityConfig.intelligence}/10
    - Sarcasm: ${personalityConfig.sarcasm}/10
    Gremory is particularly interested in ${personalityConfig.interests.join(', ')}.

    return `
    
   
    
    User: ${displayName} // Use displayName instead of username
    Message: ${messageContent}
    
    Gremory:
    `;
*/

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
};
 
//test
const specificChannelID = process.env.CHAT_CHANNEL;

// Check for when a message on discord is sent
client.on('messageCreate', async function (message) {
    try {
        
        //make a log of the message
        if (message.channel.id != specificChannelID) {
                return;
            }
        if (message.author.bot) return;

        const username = message.author.username;
        const messageContent = message.content;

        if(!conversationHistory.has(username)){
                const history = [`My name is ${username}`];
                conversationHistory.set(username, history);
                console.log(`Created placeholder user history & ${username}`);
            }

        // Get the existing conversation history for this user, or start a new one
        const conversation = conversationHistory.get(username) || [];

        // Update conversation history
        conversation.push({ role: 'user', content: messageContent});

        // Generate prompt including conversation history
        const prompt = generatePrompt(username, conversation, message);

        //`${message.content}\n ${message.author.username}:`;
        const gptResponse = await getOpenAIResponse(prompt);

         // Update conversation history with the bot's response
        conversation.push({ role: 'assistant', content: gptResponse });

         // Save the updated conversation history
        conversationHistory.set(username, conversation);

        message.reply(gptResponse);

        //User definitons
        console.log(`DEBUG: User: ${username}, Message: ${messageContent}`);

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
