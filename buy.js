'use strict';
const { request } = require('undici');
const urlencoded = new URLSearchParams();
urlencoded.append('sessionid', '4007532c98755880b745fde9');
urlencoded.append('currency', '18');
urlencoded.append('subtotal', '6');
urlencoded.append('fee', '2');
urlencoded.append('total', '8');
urlencoded.append('quantity', '1');
urlencoded.append('billing_state', ' ');
urlencoded.append('save_my_address', '0');

const options = {
  method: 'POST',
  headers: {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,uk;q=0.7,de;q=0.6',
    Connection: 'keep-alive', // Fixed: Removed leading space
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie:
      'sessionid=4007532c98755880b745fde9; recentlyVisitedAppHubs=570; timezoneOffset=7200,0; cookieSettings=%7B%22version%22%3A1%2C%22preference_state%22%3A1%2C%22content_customization%22%3Anull%2C%22valve_analytics%22%3Anull%2C%22third_party_analytics%22%3Anull%2C%22third_party_content%22%3Anull%2C%22utm_enabled%22%3Atrue%7D; browserid=98624020016108160; steamCountry=DE%7C856b11021deedd3176edeca7bd5f69a8; steamLoginSecure=76561198964606189%7C%7CeyAidHlwIjogIkpXVCIsICJhbGciOiAiRWREU0EiIH0.eyAiaXNzIjogInI6MDAxNF8yNjIwNkQxNl84MDJBMSIsICJzdWIiOiAiNzY1NjExOTg5NjQ2MDYxODkiLCAiYXVkIjogWyAid2ViOmNvbW11bml0eSIgXSwgImV4cCI6IDE3NDQ5MjQ0MDQsICJuYmYiOiAxNzM2MTk3MzA3LCAiaWF0IjogMTc0NDgzNzMwNywgImp0aSI6ICIwMDBDXzI2Mjg3RjJGXzBCMUFBIiwgIm9hdCI6IDE3NDQ3Mjg3NjcsICJydF9leHAiOiAxNzYyNzgwOTYzLCAicGVyIjogMCwgImlwX3N1YmplY3QiOiAiNzcuMC4xNzIuMjIyIiwgImlwX2NvbmZpcm1lciI6ICI3Ny4wLjE3Mi4yMjIiIH0.3cWNIKEYqd2Oo9fpb0zxH1N2xCA0hLmHkpzk82KzRv5ptDanQGRh2P63wr2AkyXsOU_6ySet_YaZ-oHEilh8Aw; webTradeEligibility=%7B%22allowed%22%3A1%2C%22allowed_at_time%22%3A0%2C%22steamguard_required_days%22%3A15%2C%22new_device_cooldown_days%22%3A0%2C%22time_checked%22%3A1744837314%7D; app_impressions=2923300@2_100100_100101_100104; strInventoryLastContext=2923300_2; sessionid=d2c2c7c6bcb727fa5ba5e399; steamCountry=DE%7C856b11021deedd3176edeca7bd5f69a8',
    Host: 'steamcommunity.com',
    Origin: 'https://steamcommunity.com',
    Referer:
      'https://steamcommunity.com/market/listings/2923300/Gelatinous%20Banana',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    'sec-ch-ua':
      '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  },
  body: urlencoded.toString(),
};

request(
  'https://steamcommunity.com/market/buylisting/641301361226182683',
  options,
)
  .then(console.log)
  .then((res) => res.body.json())
  .then((res) => console.log(res))
  .catch((error) => console.error('Request failed:', error));
