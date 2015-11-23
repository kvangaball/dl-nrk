#! /usr/bin/env node

console.log('dl-nrk');


process.stdin.resume();
process.stdin.setEncoding('utf8');

var util = require('util');
var jsdom = require('jsdom');
var exec = require('child_process').exec;

var jobber;

if (process.argv.length < 3 || process.argv.length > 4) {
  console.log("Feil antall argumenter "+process.argv.length );
  process.exit();
}
else{
  console.log('Henter '+process.argv[2]);
  hent(process.argv[2], process.argv[3]);

  //poll();
}

function poll(){
  var ferdige = 0;

  console.log("..");
  if(!jobber) return;

  jobber.forEach(function(element, idx, array){
    console.log(element.status);

    if(element.status === 'ferdig'){
      ferdige++;
      jobber.splice[idx];
    }
  });

  console.log("Ferdige: "+ferdige+". Jobber: "+jobber.length);
  if(ferdige === jobber.length){
    process.exit();
  }
}

function hent(url, folder){
  jsdom.env(
    'https://tv.nrk.no/serie/'+url,
    ["http://code.jquery.com/jquery.js"],
    function (errors, window) {
      var links = window.$("li.episode-item a");

      console.log("Fikk ", links.length, " treff.");

      jobber = [];

      window.$.each(links, function(el){
        if(!window.$(links[el]).hasClass('no-rights')){
          var url = window.$(links[el]).attr('href');
          var jobb = {"idx": el, "url": url, "folder": folder, "status": "ny"};

          jobber.push(jobb);

          hentEpisodeInfo(jobb);
        }
      });
    }
  );
}

function hentEpisodeInfo(jobb){
  console.log("Henter info om "+jobb.url);
  jobb.status = "henter info";

  jsdom.env(
    {
      "url": 'https://tv.nrk.no/'+jobb.url,
      "scripts": ["http://code.jquery.com/jquery.js"],
      "document": {"cookie": ["NRK_PLAYER_SETTINGS_TV=devicetype=desktop","preferred-player-odm=hlslink","preferred-player-live=hlslink","max-data-rate=3500"]},
      "done": function (errors, window) {

        var url = window. $('div.playerelement').attr('data-hls-media');
        var navn = window.$('title').text().substr(9);
      	navn = replaceAll(navn, " ", "_");
        navn = replaceAll(navn, ":", "_");

        if(!navn){
          console.log('Fant ikke tittel i resultat');
          jobb.status = "ferdig";

          poll();
          return;
        }

        var filSti = jobb.folder +'/'+navn+'.mp4'
        if(filEksisterer(filSti)){
          console.log('Fil eksisterer allerede: '+filSti);
          jobb.status = "ferdig";
          poll();

          return;
        }

        jobb.videourl = url;
        jobb.path = filSti;
        jobb.navn = navn;

        jobb.status = "info hentet";

        lastNedStream(jobb);
      }
    }

  );

}

var fs = require('fs');
function filEksisterer(path){

  try {
    stats = fs.lstatSync(path);

    if (stats.isFile()) {
        return true;
    } else {
      return false;
    }
  }
  catch (e) {
      return false;
  }
}

function lastNedStream(jobb){
  console.log("Laster ned: " + jobb.navn);
  jobb.status = "laster ned stream";

  var call = 'ffmpeg -i '+jobb.videourl+' -bsf:a aac_adtstoasc -c copy '+ jobb.path;

  exec(call, function callback(error, stdout, stderr){
    console.log("success!! " + jobb.navn);
    jobb.status = "ferdig";
    poll();
  });
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
