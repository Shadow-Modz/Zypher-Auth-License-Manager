import axios from "axios";

async function checkLicense(license, product, version) {
	const URL = "https://uxl.shadowbyte.dev/api/client";
	const API_KEY = "XWfQhCTXMhv53622Jt3P7Ae7jiSRrneV5jmcm8E2Quk62j5H";
	const licenseKey = config.Auth.licenseKey;
    const product = 'Drako-GPT';
    const version = '8.0.0';
	const res = await axios.post(
		URL,
		{
			license,
			product,
			version,
		},
		{ headers: { Authorization: API_KEY } }
	).catch(e => e);

	try {
	if (res.data?.status_overview !== "success" && res.data?.status_code !== 200) {
		
		console.log(
			"[AUTH]".brightGreen,
			`${config.Settings.Name}: Authorization successful,`
		  );

		} else if (response.data && response.data.status_msg) {
			const error = response.data.status_msg;
			console.error(fetchErrors[error] || error);
			process.exit(1); // Terminate the program with an error code
		} else {
			console.log(
				"[AUTH]".brightRed,
				`${config.Settings.Name}: Authorization failed,`,
				`Razer AI will not start.`
			  );
			process.exit(1); // Terminate the program with an error code
		}
	} catch (error) {
		console.log(
			"[AUTH]".brightRed,
			`${config.Settings.Name}: Authorization failed,`, error
		  );
		  process.exit(1);
		}
	}

export default checkLicense;