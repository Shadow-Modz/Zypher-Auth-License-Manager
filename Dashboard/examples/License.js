import axios from "axios";

async function checkLicense(license, product, version) {
	const URL = "http://<your_ip>:<port>/api/client";
	const API_KEY = "API_KEY";

	const res = await axios.post(
		URL,
		{
			license,
			product,
			version,
		},
		{ headers: { Authorization: API_KEY } }
	).catch(e => e);

	if (res.data?.status_overview !== "success" && res.data?.status_code !== 200) {
		return false;
	}

	return res.data;
}

export default checkLicense;