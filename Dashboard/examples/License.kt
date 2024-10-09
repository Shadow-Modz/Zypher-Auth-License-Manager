import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

fun main(args: Array<String>) {
    val url = URL("http://<your_ip>:<port>/api/client")
    val apiKey = "API_KEY"
    val license = "<LICENSE>"
    val product = "<PRODUCT>"
    val version = "<VERSION>"

    val postData = "license=${URLEncoder.encode(license, "UTF-8")}&product=${URLEncoder.encode(product, "UTF-8")}&version=${URLEncoder.encode(version, "UTF-8")}"

    val connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Authorization", apiKey)
    connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
    connection.doOutput = true

    val outputBytes = postData.toByteArray(charset("UTF-8"))
    connection.outputStream.write(outputBytes)

    val responseCode = connection.responseCode
    if (responseCode == HttpURLConnection.HTTP_OK) {
        val responseBytes = connection.inputStream.readBytes()
        val response = String(responseBytes)
        println(response)
    } else {
        println("Failed with HTTP code: $responseCode")
    }
    connection.disconnect()
}
