/**
 * Config
 * @type {string}
 */

const customFile = '../locus-custom.yml';


/**
 *  Includes
 */
const fs = require('fs')
const YAML = require('yaml');
const {exec} = require('child_process');
const dotenv = require('dotenv')


const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});


let configNew = true;
let configs = {};

//let OSOpenData = require('./docker/load_os_opendata');
/**
 *  Start
 */
console.log("Locus config tool");

checkEnvironment();


function checkEnvironment() {

	exec('aws configure list', (err, stdout, stderr) => {
		if (err) {
			//some err occurred
			console.log('AWS CLI is not found please install https://docs.aws.amazon.com/cli/latest/userguide/install-windows.html');
			process.exit();
		} else {
			//console.log(`stdout: ${stdout}`);
			if (fs.existsSync(customFile)) {
				console.log('Existing config found');
				configs.custom = YAML.parse(fs.readFileSync(customFile, 'utf8'));
				configNew = false;
				listConfig();
			} else {
				configs.custom = {};
				console.log('No existing config found');
			}
			commandLoop();

		}
	});
}

function commandLoop() {
	readline.question(`Command[h for help]?`, (cmd) => {
		switch (cmd) {
			case 'h':
				console.log('l - List current config sections');
				console.log('a - Add new config section');
				console.log('d - Delete config section');
				console.log('w - Write the current config');
				console.log('e - Deploy system');
				console.log('ld - Load Data (OS Opendata)');
				console.log('q - Quit');
				commandLoop();
				break;
			case 'l':
				listConfig();
				break;
			case 'a':
				addConfig();
				break;
			case 'd':
				deleteConfig();
				break;
			case 'w':
				writeConfig();
				break;
			case 'e':
				deploySystem();
				break;
			case 'ld':
				loadData();
				break;
			case 'q':
				process.exit(0);
				break;

		}
	})
}

async function loadData() {

	let stage = Object.keys(configs.custom)[0];


	let cmd = await new Promise(resolve => {
		readline.question(`Stage to use [${stage}]?`, resolve);
	});

	if (cmd) {
		stage = cmd;
	}

	cmd = await new Promise(resolve => {
		readline.question("Data set to load [OpenNames]?", resolve);
	});

	configs.custom[stage]['dataSet'] = cmd;
	process.env["AWS_PROFILE"] = configs.custom[stage].profile;


	commandLoop();

}


function deploySystem() {
	let stage = Object.keys(configs.custom)[0];
	readline.question(`Stage to deploy [${stage}]?`, (cmd) => {
		if (cmd)
			stage = cmd;
		deploySystemMain(stage);
	});
}

function deploySystemMain(stage) {
	readline.question(`Deploy command for stage ${stage} [h for help]?`, (cmd) => {
		switch (cmd) {
			case 'h':
				console.log('api - Deploy API');
				console.log('sql - Deploy SQL');
				console.log('usql - Upgrade SQL');
				console.log('web - Deploy Web interface');
				console.log('scrape - Deploy scraper');
				console.log('ws - Deploy websocket');
				console.log('tests - Run Tests');
				console.log('q - Exit deploy mode');
			case 'all':
				deploySystemMain(stage);
				break;
			case 'scrape':
				deployScrape(stage);
				break;
			case 'api':
				deployAPI(stage);
				break;
			case 'web':
				deployWEB(stage);
				break;
			case 'sql':
				deploySQL(stage);
				break;
			case 'usql':
				upgradeSQL(stage);
				break;
			case 'ws':
				deployWS(stage);
				break;
			case 'tests':
				runTests(stage);
				break;
			case 'q':
				commandLoop();
				break;
			default:
				console.log(`Unknown mode [${cmd}]`);
				commandLoop();
				break;
		}
	});
}


function runTests(stage) {
	const options = {};
	const cmdLine = `grunt runTests --stage=${stage}`;
	console.log(`#${cmdLine}`);
	exec(cmdLine, options, (err, stdout, stderr) => {
		console.log(stdout);
		console.log(err);
		console.log(stderr);
		deploySystemMain(stage);
	});
}

function deployScrape(stage) {
	const options = {
		cwd: "scrape/"
	};
	console.log('#npm install')
	exec(`npm install`, options, (err, stdout, stderr) => {
		if (err) {
			console.log('npm install FAILED!');
			console.log(stderr);
			deploySystemMain(stage);

		} else {
			console.log(stdout);
			const cmdLine = `serverless deploy --stage ${stage}`;
			console.log(`#${cmdLine}`);
			exec(cmdLine, options, (err, stdout, stderr) => {
				console.log(stdout);
				deploySystemMain(stage);
			});
		}
	});
}

function deployWS(stage) {
	const options = {
		cwd: "websocket/"
	};
	console.log('#npm install')
	exec(`npm install`, options, (err, stdout, stderr) => {
		if (err) {
			console.log('npm install FAILED!');
			console.log(stderr);
			deploySystemMain(stage);

		} else {
			console.log(stdout);
			const cmdLine = `sls create_domain --stage ${stage}`;
			console.log(`#${cmdLine}`);
			exec(cmdLine, options, (err, stdout, stderr) => {
				console.log(stdout);
				const cmdLine = `serverless deploy --stage ${stage}`;
				console.log(`#${cmdLine}`);
				exec(cmdLine, options, (err, stdout, stderr) => {
					console.log(stdout);
					deploySystemMain(stage);
				});
			});
		}
	});
}

function deployAPI(stage) {
	const options = {
		cwd: "api/"
	};
	console.log('#npm install')
	exec(`npm install`, options, (err, stdout, stderr) => {
		if (err) {
			console.log('npm install FAILED!');
			console.log(stderr);
			deploySystemMain(stage);

		} else {
			console.log(stdout);
			const cmdLine = `sls create_domain --stage ${stage}`;
			console.log(`#${cmdLine}`);
			exec(cmdLine, options, (err, stdout, stderr) => {
				console.log(stdout);
				const cmdLine = `serverless deploy --stage ${stage}`;
				console.log(`#${cmdLine}`);
				exec(cmdLine, options, (err, stdout, stderr) => {
					console.log(stdout);
					const cmdLine = `sls export-env --stage ${stage}`;
					console.log(`#${cmdLine}`);
					exec(cmdLine, options, (err, stdout, stderr) => {
						console.log(stdout);
						deploySystemMain(stage);
					});
				});
			});
		}
	});
}

function executeWithCatch(cmd, success, fail, options) {
	options = Object.assign({
		cwd: "./"
	}, options);
	console.log(`#${cmd}`);
	exec(cmd, options, (err, stdout, stderr) => {
		if (err) {
			console.log('command FAILED!');
			console.log(stderr);
			console.log(err);
			fail();
		} else {
			console.log(stdout);
			success();
		}
	});
}

function deployWEB(stage) {

	const buf = fs.readFileSync('api/.env');
	const config = dotenv.parse(buf)
	let path = 'main';
	readline.question(`Path to use [${path}]?`, (cmd) => {
		if (cmd)
			path = cmd;
		executeWithCatch('webpack --config webpack.config.js', () => {
			const cmdLine = `grunt deploySite --profile=${configs['custom'][stage].profile} --stage=${stage} --distribution=${config.cfdist} --bucket=${configs['custom'][stage].domain} --region=${configs['custom'][stage].region} --path=${path}`;
			executeWithCatch(cmdLine, () => {
				deploySystemMain(stage);
			}, () => {
				deploySystemMain(stage);
			})
		}, () => {
			deploySystemMain(stage);
		});

	});


}

function deploySQL(stage) {
	const options = {};
	const cmdLine = `grunt deploySQLFull --stage=${stage}`;
	console.log(`#${cmdLine}`);
	exec(cmdLine, options, (err, stdout, stderr) => {
		console.log(stdout);
		console.log(err);
		console.log(stderr);
		deploySystemMain(stage);
	});
}

function upgradeSQL(stage) {
	executeWithCatch(`grunt deploySQLupgrade --stage=${stage}`, () => {
		deploySystemMain(stage);

	}, () => {
		deploySystemMain(stage);
	});
}

function deleteConfig() {
	let stage = 'dev';
	readline.question(`system stage [${stage}]?`, (cmd) => {
		if (cmd.length > 0)
			stage = cmd;
		delete configs.custom[stage];
		commandLoop();
	});
}

const configQuestions = [
	{
		details: "Give the deployment stage a name, EG dev|test|live. This is used to reference this profile in the future",
		name: "stage",
		text: "Stage name",
		default: "dev",
		config: "custom",
		stage: true
	},
	{
		details: "You need aws cli install and configured to access your account, enter the profile used here",
		name: "profile",
		text: "AWS profile to use",
		default: "default",
		config: "custom"
	},

	{name: "region", text: "AWS region", default: "eu-west-1", config: "custom"},
	{name: "cron", text: "Cron string to use for scraper", default: "cron(0/10 * ? * MON-FRI *)", config: "custom"},
	{name: "domain", text: "Domain name to use for website", default: "api.vialocus.co.uk", config: "custom"},
	{name: "restdomain", text: "Domain name to use for rest api", default: "api.vialocus.co.uk", config: "custom"},
	{name: "wsdomain", text: "Domain name to use for websocket", default: "ws.vialocus.co.uk", config: "custom"},
	{name: "certARN", text: "AWS cert ARN", default: "arn:aws:acm:us-east-1:xxxxxxxxxxxxxxxx", config: "custom"},
	{name: "auroraDatabaseName", text: "Aurora database name", default: "locus", config: "custom"},
	{name: "auroraMasterUser", text: "Aurora master user", default: "locus", config: "custom"},
	{name: "auroraMasterPass", text: "Aurora master password", default: "CHANGEME", config: "custom"},
	{
		name: "osDataHubProductURL",
		text: "OS Data Hub Product URL (Data Downloads)",
		default: "https://api.os.uk/downloads/v1/products",
		config: "custom"
	},
	{name: "tmp", text: "Temporary local storage for downloads", default: "/tmp", config: "custom"}
];

function addConfig() {

	let index = 0;
	let stage = 'dev';

	askQuextion();

	function askQuextion() {
		if (index < configQuestions.length) {
			if (configQuestions[index].details)
				console.log(configQuestions[index].details);
			readline.question(`${configQuestions[index].text} [${configQuestions[index].default}]?`, (cmd) => {
				if (cmd.length === 0)
					cmd = configQuestions[index].default;
				if (configQuestions[index].stage === true) {
					stage = cmd;
					configs['custom'][stage] = {};
				} else {
					configs[configQuestions[index].config][stage][configQuestions[index].name] = cmd;
				}
				index++;
				askQuextion();
			});
		} else {
			commandLoop();
		}
	}
}

function writeConfig() {
	fs.writeFileSync(customFile, YAML.stringify(configs.custom));
	console.log('Config files written');
	commandLoop();

}

function listConfig() {
	for (let i in configs.custom) {
		console.log(`[${i}]`);
	}
	commandLoop();

}