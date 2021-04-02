// WIX Specific JSON resource from the network using HTTPS.
import {fetch} from 'wix-fetch';

// Binance target for One price. kline_1m, _10m, _30m <-- choose intervals.
// Full list of intervals in binance API docs. 
const tickerPriceUrl = 'wss://stream.binance.com:9443/ws/oneusdt@kline_1m';

// Url for Harmony Stats.
const harmonyApiUrl = "https://api.harmony.one";

// Replace this with your wallet address (public key). 
const pubKey = "one1xa843twfjzkkk8ekj79t7n2ynah6djl0e3ty4x";


$w.onReady(function () {
	// Wix style onReady function.
	
	getOnePrice(tickerPriceUrl);
	getCurrentStats(harmonyApiUrl, pubKey);
	getBlockStats(harmonyApiUrl, null);

	// To select an element by ID use: $w("#elementID")

});


function getOnePrice(url) {
/* Grabs One price from Binance.com. 
*/
	
	var socket = new WebSocket(url);

	// When message received from web socket then...
	socket.onmessage = function (event) {
		let data = JSON.parse(event.data);
		let openPrice = data.k.o;
		updateOpenPrice(openPrice);
	}
}


function updateOpenPrice(price){
	// Updates elements on page with price information. 
	
	if (price != undefined){
		price = new Number(price);
		price = price.toPrecision(6);
		
		$w("#tickerPrice").text = "1 One = $" + price;
		$w("#subHeader").text = "Harmony One Validation | Current Price: $" + price;
	}
}


function setParams(pubKey, method) {
	// Sets params for basic Harmony API call.
	
	// Sends empty brackets for params if no address required.
	if (pubKey != null){
		pubKey = `["${pubKey}"]`
	} else { pubKey = "[]"}
	
	let data = `{
		"jsonrpc":"2.0",
    	"method":"${method}",
    	"params": ${pubKey},
    	"id": 1}`;
	
	JSON.stringify(data)
	return data;
}


function createRequest(url){
	// Creates basic XMLHttpRequest for Harmony API. 
	
	let xhr = new XMLHttpRequest();
	
	xhr.open("POST", url);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.setRequestHeader("Accept", "application/json");
	xhr.responseType = "json";
	
	return xhr
}

function getCurrentStats(url, pubKey) {
	// Gets basic validator account stats. 

	let data = setParams(pubKey, "hmy_getValidatorInformation");
	let xhr = createRequest(url);

	xhr.send(data);
	xhr.onreadystatechange = function () {
   		if (xhr.readyState === 4) {
			let json = xhr.response;
			updateStats(json);
   		}
	};
}


function getBlockStats(url, pubKey) {
	// Gets block stats.

	let data = setParams(pubKey, "hmyv2_blockNumber");
	let xhr = createRequest(url);

	xhr.send(data);
	xhr.onreadystatechange = function () {
   		if (xhr.readyState === 4) {
			let json = xhr.response;
			updateBlockStats(json);
   		}
	};
}


function updateStats(json){
	// Updates Validator Specific stats. 

	const stakingGoal = 10000000
	let totalStaked = Number(json.result["total-delegation"]) / 1e18
	let percentGoal = (totalStaked / stakingGoal) * 100

	// Wix specific update to elements.
	$w("#totalStaked").text = totalStaked.toLocaleString("en").toString();
	$w("#stakingGoal").text = stakingGoal.toLocaleString("en").toString();
	$w("#percentStaked").text = percentGoal + "%";
	$w("#validatorPubKey").text = pubKey;

}

function updateBlockStats(json){
	// Updates block specific stats. 
	
	let currentBlock = json.result;
	
	// Wix specific update to elements.
	$w("#currentBlock").text = currentBlock.toString();
}
