import requests

URL_ENDPOINT = "http://<your_ip>:<port>/api/client"
API_KEY = "YOUR_API_KEY"

licensekey = "YOUR_LICENSE_KEY" # Get this from a config file
product = "YOUR_PRODUCT_NAME"
version = "PRODUCT_VERSION"

headers = {'Authorization': API_KEY}
data = {'license': licensekey, 'product': product, 'version': version}
response = requests.post(URL_ENDPOINT, headers=headers, json=data)
status = response.json()

if status['status_overview'] == "success":
  print("Your license key is valid!")
  print("Discord ID: " + status['discord_id'])
else:
  print("Your license key is invalid!")
  print("Create a ticket in our discord server to get one.")
  exit()
  