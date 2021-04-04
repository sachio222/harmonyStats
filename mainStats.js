const TICKER_1MIN_URL = "wss://stream.binance.com:9443/ws/oneusdt@kline_1m";
const HARMONY_API_URL = "https://api.harmony.one";

// Replace this with your wallet address (public key). 
const PUB_KEY = "one1xa843twfjzkkk8ekj79t7n2ynah6djl0e3ty4x";
const HARMONY_UPDATE_INTERVAL_MS = 10000;
const BINANCE_UPDATE_INTERVAL_MS = 60000;

let isFirstBlock = true;
let firstBlockGlobal, currentBlockGlobal, firstBlockReadTimeGlobal;


$w.onReady(function () {
	getBinanceTicker(TICKER_1MIN_URL);

	firstBlockReadTimeGlobal = Date.now() // Update first session block read time.
	
	updateHarmonyStats();
	setInterval(updateHarmonyStats, HARMONY_UPDATE_INTERVAL_MS);
})


/* Binance Ticker Data */
const getBinanceTicker = async (url) => {
	let socket = new WebSocket(url);
	// Get price every minute
	setInterval((
		socket.onmessage = (event) => {
			try {
				let data = JSON.parse(event.data);
				let priceOpen = data.k.o;
				refreshOpenPrice(priceOpen)
			} catch {
				console.log ("Price data skipped. Try again.")
			}

	}), BINANCE_UPDATE_INTERVAL_MS);	
}


let refreshOpenPrice = (price) => {
/* Updates elements on page with price information. */
	
	if (price != undefined){
		price = new Number(price);
		price = price.toPrecision(6);
		
		$w("#tickerPrice").text = "1 One = $" + price;
		$w("#subHeader").text = "Harmony One Validation | Current Price: $" + price;
	}
}


/* Harmony Data */
const updateHarmonyStats = async () => {
	let data = await gatherHarmonyData(HARMONY_API_URL, PUB_KEY);
	refreshDataOnScreen(data);
}


const gatherHarmonyData = async (url, pubKey) => {
	// Returns object of json objects for each endpoint.

	let stakingJson = await getStatsFromHarmony(url, pubKey, "hmy_getValidatorInformation");
	let blockJson = await getStatsFromHarmony(url, null, "hmyv2_blockNumber");
	let epochJson = await getStatsFromHarmony(url, null, "hmyv2_getStakingNetworkInfo");

	return { stakingJson, blockJson, epochJson }
}


const getStatsFromHarmony = async (url, pubKey, method_id) => {
	/* Returns validator stats based on pubKey. */

	let data = setParams(pubKey, method_id);

	// Fetch from endpoints. 
	const response = await fetch(url, {
		method: "POST",
		body: data,
		headers: {
			'Content-Type': 'application/json',
			"Accept": "application/json"
		}
	})
	const json = await response.json();

	return json;
}


const setParams = (pubKey, method) => {
/* Returns object of json params as string. */

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


const refreshDataOnScreen = (data) => {
	refreshStakingStats(data.stakingJson);
	refreshBlockStats(data.blockJson);
	refreshEpochStats(data.epochJson);
}


let refreshStakingStats = (json) => {
/* Updates Validator Specific stats. */
	
	const STAKINGGOAL = 10000000

	let totalStaked = Number(json.result["total-delegation"]) / 1e18
	let percentGoal = (totalStaked / STAKINGGOAL) * 100

	// Wix specific update to elements.
	$w("#totalStaked").text = totalStaked.toLocaleString("en").toString();
	$w("#stakingGoal").text = STAKINGGOAL.toLocaleString("en").toString();
	$w("#percentStaked").text = percentGoal + "%";
	$w("#validatorPubKey").text = PUB_KEY;
}


let refreshBlockStats = (json) => {
/* Updates block specific stats. */

	currentBlockGlobal = json.result;
	
	// Wix specific update to elements.
	$w("#currentBlock").text = currentBlockGlobal.toString();

	return currentBlockGlobal;
}


let refreshEpochStats = (json) => {
/* Updates Epoch Stats. */

	let epochLastBlock = json.result["epoch-last-block"]

	let result = calculateNextEpochTime(currentBlockGlobal, epochLastBlock);

	$w("#avgSeconds").text = result.seconds
	$w("#nextEpoch").text = result.timeEstimate
}


let calculateNextEpochTime = (currentBlock, epochLastBlock) => {
	let timeEstimate, seconds;

	let processingSeconds = getAverageBlockTime(Date.now());
	
	let blockDelta = epochLastBlock - currentBlock;
	let totalSeconds = blockDelta * processingSeconds;
	let hours = totalSeconds / 3600
	let minutes = totalSeconds % 3600 / 60

	if (!isNaN(minutes)){
		timeEstimate = Math.floor(hours) + " hours " + Math.floor(minutes) + " minutes (approximate)"
	} else {
		timeEstimate = "Calculating...";
	}

	if (!isFinite(processingSeconds)){
		seconds = "Calculating..."
	} else {
		seconds = processingSeconds.toFixed((2)) + " seconds"
	}

	return {
		seconds,
		timeEstimate
	}
}


let getAverageBlockTime = (timeOnNewBlock) => {
/* Calculates average block time in seconds. */

	if (isFirstBlock == true){
		firstBlockGlobal = currentBlockGlobal;
		isFirstBlock = false;
	}

	let elapsedBlocks = currentBlockGlobal - firstBlockGlobal;
	let elapsedTime = timeOnNewBlock - firstBlockReadTimeGlobal;
	let averageBlockSeconds = elapsedTime / elapsedBlocks / 1000;

	console.log(averageBlockSeconds)
	return averageBlockSeconds;
}
