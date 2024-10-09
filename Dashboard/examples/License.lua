PerformHttpRequest(
    "http://<your_ip>:<port>/api/client",
    function(errorCode, resultData, headers)
        data = json.decode(resultData)
        if data.status_overview == "success" then
            print("^2[SCRIPT_NAME] Your license key is valid!")
            print("^2[SCRIPT_NAME] Discord ID: " .. data.discord_id .. "")
        else
            print("^1[SCRIPT_NAME] Your license key is invalid!")
            print("^1[SCRIPT_NAME] Create a ticket in our discord server to get one.")
        end
    end,
    "POST",
    json.encode({license = "GET_LICENSE_KEY_FROM_CONFIG", product = "YOUR_SCRIPT_NAME"}),
    {["Content-Type"] = "application/json", ["Authorization"] = "YOUR_API_KEY"}
)
