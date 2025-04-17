'use strict';
const { request, ProxyAgent } = require('undici');
const urlencoded = new URLSearchParams();
urlencoded.append('sessionid', '4007532c98755880b745fde9');
urlencoded.append('currency', '5');
urlencoded.append('subtotal', '132');
urlencoded.append('fee', '19');
urlencoded.append('total', '151');
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
      'sessionid=4007532c98755880b745fde9; recentlyVisitedAppHubs=570; timezoneOffset=7200,0; cookieSettings=%7B%22version%22%3A1%2C%22preference_state%22%3A1%2C%22content_customization%22%3Anull%2C%22valve_analytics%22%3Anull%2C%22third_party_analytics%22%3Anull%2C%22third_party_content%22%3Anull%2C%22utm_enabled%22%3Atrue%7D; browserid=98624020016108160; app_impressions=2923300@2_100100_100101_100104; strInventoryLastContext=730_2; steamCountry=DE%7C8593b9702d17246c8d9792cefc650cba; steamLoginSecure=76561199024280128%7C%7CeyAidHlwIjogIkpXVCIsICJhbGciOiAiRWREU0EiIH0.eyAiaXNzIjogInI6MDAwNF8yNjI4N0YzOF80NDMxQyIsICJzdWIiOiAiNzY1NjExOTkwMjQyODAxMjgiLCAiYXVkIjogWyAid2ViOmNvbW11bml0eSIgXSwgImV4cCI6IDE3NDQ5ODkwMjUsICJuYmYiOiAxNzM2MjYwODc3LCAiaWF0IjogMTc0NDkwMDg3NywgImp0aSI6ICIwMDAxXzI2Mjg3RjMwXzU5Q0E1IiwgIm9hdCI6IDE3NDQ5MDA4NzYsICJydF9leHAiOiAxNzYzMTI5MTEyLCAicGVyIjogMCwgImlwX3N1YmplY3QiOiAiNzcuMTQuNDguMjQ1IiwgImlwX2NvbmZpcm1lciI6ICI3Ny4xNC40OC4yNDUiIH0.RhZ2TGFMk6-1GJbNKdEZb2MQFe-Zg_0i5d2jfxeCcAX7NLGTNepcp1IsOY2GEZIaP-yuT9GY-x3JlKhcnckzBA; webTradeEligibility=%7B%22allowed%22%3A1%2C%22allowed_at_time%22%3A0%2C%22steamguard_required_days%22%3A15%2C%22new_device_cooldown_days%22%3A0%2C%22time_checked%22%3A1744900894%7D',
    Host: 'steamcommunity.com',
    Origin: 'https://steamcommunity.com',
    Referer:
      'https://steamcommunity.com/market/listings/730/MP7%20%7C%20Forest%20DDPAT%20%28Battle-Scarred%29',
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
  // dispatcher: agent,
};

request(
  'https://steamcommunity.com/market/buylisting/637930633251094929',
  options,
)
  .then((res) => console.log(res.statusCode))
  .catch((error) => console.error('Request failed:', error));
