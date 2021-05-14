const { default: axios } = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
const token = '1563946915:AAF-1CCi84G_SFkYrLa7R5sGzCavXX4nYC0';
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

var interval;

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, "hello <br/> How are you");
  bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, 'bot Started');
  // Geting Districe list 
  let districts = await getDistrict();

  interval = setInterval(()=>{
  bot.sendMessage(chatId, 'Interval Started');
  districts.forEach(async dist=>{
  console.log('Looking for '+dist.district_name);
  await sleep(10000);
  bot.sendMessage(chatId, 'Looking for '+dist);
  checkVaccineByDistrict(dist.district_id).then(res=>{
    let centers = res.data.centers;
    center_details = centers.map(x=>{
        return {
            center : x.name,
            age: x.sessions?.[0].min_age_limit,
            available : x.sessions?.[0].available_capacity,
            date : x.sessions?.[0].date,
            vaccine : x.sessions?.[0].vaccine,
            district: x.district_name
        } 
       
    })
    bot.sendMessage(chatId, 'Fetch Details');

    // check avaibality
  
    checkAvailability(center_details)
    bot.sendMessage(chatId, "Completed");


  }).then(async ()=> await sleep(1000)).catch(e=>{
    console.log(e.message, dist);
    bot.sendMessage(chatId, JSON.stringify(e,' ',2));
  })
});
},10*60*1000);
console.log("Interval id",interval);
});
bot.onText(/\/stop/, (msg) => {
  clearInterval(interval)
  console.log("Stoped Interval id",interval);
})
function getDate() {
  var d = new Date(),
      month =  d.getMonth(),
      day = d.getDate() + 1,
      year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [day,month,year].join('-');
}

async function getDistrict(){
    let date = getDate();
    console.log('Calling District api',new Date().toISOString());
    return axios.get(`https://cdn-api.co-vin.in/api/v2/admin/location/districts/4`, 
    {headers: {
      "Accept-Language": "hi_IN",
      "Accept":"application/json",
      "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    }
  }).then(res=> {return res.data.districts})
}

async function checkVaccineByDistrict(district_id){
  let date = getDate();
  console.log('waiting 10s before hitting api',new Date().toISOString());
  console.log('Calling Cowin api',new Date().toISOString());
  return axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${district_id}&date=${date}`, 
  {headers: {
    "Accept-Language": "hi_IN",
    "Accept":"application/json",
    "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
  }
})
}

async function notifyChannel(center_details){
    let res = await axios.get(`https://api.telegram.org/bot${token}/sendMessage?chat_id=@assam_vaccine&text=${JSON.stringify(center_details,' ',2)}`, 
    {headers: {
      "Accept-Language": "hi_IN",
      "Accept":"application/json",
      "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    }
  });
  console.log(res);
}


function checkAvailability(center_details){
    is_available = center_details.filter(x=> x.available >0 && x.age === 18 );
    if(is_available.length > 0)
       notifyChannel(buildMsg(is_available))

}

function buildMsg(is_available){
  msg = '';
  is_available.forEach(ele => {
    msg += `Center Name : ${ele.center}(${ele.district})\n`;
    msg += `Available : + ${ele.available} \n`;
    msg += `Date : + ${ele.date} \n`;
    msg += `Vaccine : + ${ele.vaccine} \n`;
    msg += `Age : + ${ele.age} \n`;
    msg +=`---------------------------\n`;
  });
  return encodeURI(msg);
}


