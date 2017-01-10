var page = require('webpage').create();
var fs = require('fs');
var Promise = require('promise-polyfill');

var path = {
    new: "screengrabs/new/",
    check: "screengrabs/check/",
    base: "screengrabs/base/",
};

var pages = {
  "http://google.com": "Google",
  "http://amazon.com": "Amazon",
}

var URLS = [];

for (var url in pages) {
  URLS.push(url);
}

var SCREENSHOT_WIDTH = 1280;
var SCREENSHOT_HEIGHT = 900;
var LOAD_WAIT_TIME = 1000;

var getPageHeight = function(page){
    var documentHeight = page.evaluate(function() {
        return document.body.offsetHeight;
    })
    return documentHeight;
}

var renderPage = function(page, title){
    var pageHeight = getPageHeight(page);

    page.clipRect = {
        top:0,left:0,width: SCREENSHOT_WIDTH,
        height: pageHeight
    };
    page.render(path.new+title+".png");
}

var finishTakingScreenshots = function(){
    if(fs.exists(path.base)){
        checkImagesMatchBaseImages().then(function(responses){
            var allCorrect = true;

            for(var i = 0; i < responses.length; i++){
                if(!responses[i]){
                    allCorrect = false;
                }
            }

            if(!allCorrect){
                console.log("Mismatch");
                exit(1);
            } else {
                console.log("All match");
                exit(0);
            }
        });
    } else {
        checkAllImages();
        console.log("Mismatch");
        exit(1);
    }
}

var checkAllImages = function(){
    fs.makeDirectory(path.check);

    var checkList = fs.list(path.new);

    for(var i = 0; i < checkList.length; i++){
        if(checkList[i] == '.' || checkList[i] == '..'){
            continue;
        }

        fs.move(path.new + checkList[i], path.check + checkList[i]);
    }
}

var checkImagesMatchBaseImages = function(){
    var baseList = fs.list(path.base);
    var checkList = fs.list(path.new);

    var fileChecks = [];
    for(var i = 0; i < checkList.length; i++){
        fileChecks.push(doesFileNeedChecking(baseList, checkList[i]));
    }

    return Promise.all(fileChecks);
}

var doesFileNeedChecking = function(baseList, fileName){
    return new Promise(function(resolve, reject){
        if(fileName == '.' || fileName == '..'){
            resolve(true);
            return;
        }
        if(baseList.indexOf(fileName) >= 0){
            var baseImg64 = getBase64OfImage(path.base + fileName);
            var checkImg64 = getBase64OfImage(path.new + fileName);
            Promise.all([baseImg64, checkImg64]).then(function(resp){
                if(resp[0] != resp[1]){
                    fs.move(path.new + fileName, path.check + fileName);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        } else {
            fs.move(path.new + fileName, path.check + fileName);
            resolve(false);
        }
    });
}

var getBase64OfImage = function(path){
    return new Promise(function(resolve, reject){
        var newPage = require('webpage').create();
        newPage.open(path, function(status){
            resolve(newPage.renderBase64('PNG'));
        });
    });
};

var exit = function(exitCode){
    console.log("exiting phantomjs")
    phantom.exit(exitCode);
}

var takeScreenshot = function(element){
    console.log("opening URL:", element)

    var page = require("webpage").create();
    page.viewportSize = {width:SCREENSHOT_WIDTH, height:SCREENSHOT_HEIGHT};
    page.open(element);
    page.onLoadFinished = function() {
        setTimeout(function(){
            renderPage(page, pages[element])
            index++;
            if(index == URLS.length){
                finishTakingScreenshots();
            } else {
                takeScreenshot(URLS[index]);
            }
        },LOAD_WAIT_TIME)
    }

}

if(fs.exists("screengrabs/check")){
    fs.removeTree("screengrabs/check");
}
fs.makeDirectory("screengrabs/check");

var index = 0;

takeScreenshot(URLS[index]);
