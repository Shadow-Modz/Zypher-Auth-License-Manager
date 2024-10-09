using System;
using System.Net;
using System.IO;

namespace CurlExample
{
    class Program
    {
        static void Main(string[] args)
        {
            string url = "https://uxl.shadowbyte.dev/api/client";
            string apiKey = "XWfQhCTXMhv53622Jt3P7Ae7jiSRrneV5jmcm8E2Quk62j5H";
            string license = "<LICENSE>";
            string product = "Shadow Byte ToolKit";
            string version = "8.0.0";

            string postData = "license=" + license + "&product=" + product + "&version=" + version;

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "POST";
            request.Headers.Add("Authorization", apiKey);

            byte[] data = System.Text.Encoding.UTF8.GetBytes(postData);
            request.ContentType = "application/x-www-form-urlencoded";
            request.ContentLength = data.Length;

            Stream stream = request.GetRequestStream();
            stream.Write(data, 0, data.Length);
            stream.Close();

            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            string responseString = new StreamReader(response.GetResponseStream()).ReadToEnd();
            Console.WriteLine(responseString);
        }
    }
}
