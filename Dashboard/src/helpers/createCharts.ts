import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { AttachmentBuilder } from "discord.js";
import RequestModel from "../models/RequestModel";

const generateRequestCharts = async (type: string) => {
  const requests = (await RequestModel.find()).slice(
    type === "Weekly" ? -7 : -30
  );

  if (!requests.length) return false;

  const labels = requests.map(
    (r) => `${r.date.split("/")[0]}/${r.date.split("/")[1]}`
  );
  const success = requests.map(
    (r) => r.requests.filter((r) => !r.rejected).length || 0
  );
  const rejected = requests.map(
    (r) => r.requests.filter((r) => r.rejected).length || 0
  );

  const averageSuccess = (
    success.reduce((a, b) => a + b, 0) / success.length
  ).toFixed();
  const averageRejected = (
    rejected.reduce((a, b) => a + b, 0) / rejected.length
  ).toFixed();

  const render = new ChartJSNodeCanvas({
    width: 800,
    height: 350,
  });

  const buffer = await render.renderToBuffer({
    type: "line",
    options: {
      elements: {
        line: {
          tension: 0.4,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#FFF",
            textStrokeWidth: 2,
            stepSize: 20,
          },
        },
        y: {
          ticks: {
            color: "#FFF",
            textStrokeWidth: 2,
            stepSize: 12,
          },
        },
      },
    },
    data: {
      labels,
      datasets: [
        {
          label: "Rejected",
          data: rejected,
          borderColor: "#000",
          borderWidth: 1,
          backgroundColor: "#ed4245",
          fill: "start",
          pointRadius: 0,
        },
        {
          label: "Successfull",
          data: success,
          borderColor: "#000",
          borderWidth: 1,
          backgroundColor: "#57f287",
          fill: "start",
          pointRadius: 0,
        },
      ],
    },
  });

  return {
    attachment: new AttachmentBuilder(buffer, { name: "image.jpg" }),
    averageRejected,
    averageSuccess,
  };
};

export { generateRequestCharts };
