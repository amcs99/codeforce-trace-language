// Currently I need to find an user who use Golang to solve problems
// Codeforces provide some api, so I decided to write a small script
// to bruteforces to find user that have ratings >= 1600 and use Golang
// to solve problem, list user will save at './list_user.txt'.
// Also, this script can find for other languages.

const axios = require('axios');
const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// each page contain 200 user in rating list
// we need provide number of page that match our purpose
// e.g page 1 contain LGM and IGM, if we need trace to
// someone that have rating ~1k6 we need page about 60
const NUMBER_OF_PAGE = 60;

// language to find
const LANGUAGE = "Go";

// number of submissions to check, default is 500
// you can change as you want
const NUMBER_OF_SUBMISSION = 500;

const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

const doJobInpage = (async (page) => {
    try {
      const response = await axios.get('https://codeforces.com/ratings/page/' + page);
      const dom = new JSDOM(response.data);

      let table;
      try {
        table = dom.window.document.querySelector(".datatable.ratingsDatatable").children[5].children[2].children[0];
      } catch (err) {
          console.log(err);
          table = null;
      }
      if (!table) {
          console.log('Can not parse page ' + page);
          return;
      }

      // now table will contain rows that have data we need
      // just travel into it and get the username
      // just skip the fisrt element
      for (let i = 1; i < table.childElementCount; ++i) {
          const tdElement = table.children[i].children[1];
          if (!tdElement) {
            console.log('parse td element error at index ' + i + ' of page ' + page);  
            continue;
          }
          const linkProfile = tdElement.children[tdElement.childElementCount-1].href;
          if (!linkProfile) {
            console.log('parse link profile error at index ' + i + ' of page ' + page);  
            continue;
          }
          const userName = linkProfile.substring(linkProfile.lastIndexOf('/') + 1);
          if (!userName) {
            console.log('parse username error at index ' + i + ' of page ' + page);  
            continue;
          }
          // start call codeforces api to get 333 latest submissons of user
          // and check if they use languague we are searching
          console.log(`Checking user '${userName}' ...`);
          let usedLanguageWeNeed = false;
          const responseApiCodeforces = await axios.get(`https://codeforces.com/api/user.status?handle=${userName}&from=1&count=${NUMBER_OF_SUBMISSION}`);
          if (!responseApiCodeforces.data || responseApiCodeforces.data.status != 'OK') {
              // codeforces limit 5 call per sec, if exceed, just sleep 1 second then try again
              if (responseApiCodeforces.comment && responseApiCodeforces.comment.indexOf('Call limit exceeded') > -1) {
                console.log("Limiting call api, wait 1s to continue...");
                await sleep(1000);
                --i;
                continue;
              }
              console.log(`Error when call api for user '${userName}''`);
              console.log(responseApiCodeforces);
              continue;
          }
          const lstSubmissions = responseApiCodeforces.data.result;
          for (let j = 0; j < lstSubmissions.length; ++j) {
              if (lstSubmissions[j].programmingLanguage && lstSubmissions[j].programmingLanguage.indexOf(LANGUAGE) > -1) {
                  usedLanguageWeNeed = true;
                  break; 
              }
          }
          if (usedLanguageWeNeed) {
            fs.appendFileSync('list_user.txt', userName + '\n');
          }
          console.log(`Checked user '${userName}': ` + (usedLanguageWeNeed?`use `:`don't use `) + LANGUAGE);
      }
    } catch (error) {
      console.log(error);
    }
  });

console.log('Working...');
(async () => {
    for (let i = 1; i <= NUMBER_OF_PAGE; ++i) {
        await doJobInpage(i);
    }
})();
