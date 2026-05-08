const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const { getAccessToken } = require("./register");
const { Log } = require("./logger");

const NOTIFICATIONS_URL =
  "http://4.224.186.213/evaluation-service/notifications";
const DEFAULT_TOP_N = 10;
const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

async function safeLog(level, packageName, message) {
  try {
    await Log("backend", level, packageName, message);
  } catch (_error) {}
}

class MinHeap {
  constructor(compareFn) {
    this.items = [];
    this.compare = compareFn;
  }

  size() {
    return this.items.length;
  }

  peek() {
    return this.items[0] ?? null;
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) {
      return null;
    }

    const root = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return root;
  }

  toArray() {
    return [...this.items];
  }

  bubbleUp(index) {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      if (this.compare(this.items[currentIndex], this.items[parentIndex]) >= 0) {
        break;
      }

      [this.items[currentIndex], this.items[parentIndex]] = [
        this.items[parentIndex],
        this.items[currentIndex],
      ];
      currentIndex = parentIndex;
    }
  }

  bubbleDown(index) {
    let currentIndex = index;
    const length = this.items.length;

    while (true) {
      let smallestIndex = currentIndex;
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;

      if (
        leftIndex < length &&
        this.compare(this.items[leftIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = leftIndex;
      }

      if (
        rightIndex < length &&
        this.compare(this.items[rightIndex], this.items[smallestIndex]) < 0
      ) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex === currentIndex) {
        break;
      }

      [this.items[currentIndex], this.items[smallestIndex]] = [
        this.items[smallestIndex],
        this.items[currentIndex],
      ];
      currentIndex = smallestIndex;
    }
  }
}

function getTypeWeight(type) {
  return TYPE_WEIGHTS[type] ?? 0;
}

function parseTimestamp(timestamp) {
  const parsed = Date.parse(timestamp.replace(" ", "T") + "Z");

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function buildPriorityRecord(notification) {
  const typeWeight = getTypeWeight(notification.Type);
  const timestampMs = parseTimestamp(notification.Timestamp);

  return {
    id: notification.ID,
    type: notification.Type,
    message: notification.Message,
    timestamp: notification.Timestamp,
    typeWeight,
    timestampMs,
    priorityScore: typeWeight * 10 ** 15 + timestampMs,
  };
}

function compareByPriorityAscending(left, right) {
  return left.priorityScore - right.priorityScore;
}

function getTopNotifications(notifications, topN) {
  const heap = new MinHeap(compareByPriorityAscending);

  for (const notification of notifications) {
    const record = buildPriorityRecord(notification);

    if (heap.size() < topN) {
      heap.push(record);
      continue;
    }

    const currentSmallest = heap.peek();

    if (record.priorityScore > currentSmallest.priorityScore) {
      heap.pop();
      heap.push(record);
    }
  }

  return heap
    .toArray()
    .sort((left, right) => right.priorityScore - left.priorityScore);
}

async function fetchNotifications() {
  await safeLog("info", "api", "requesting notifications from evaluation API");

  const token = await getAccessToken();
  const response = await axios.get(NOTIFICATIONS_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const notifications = response.data.notifications ?? [];

  await safeLog(
    "info",
    "service",
    `fetched ${notifications.length} notifications for priority inbox`
  );

  return notifications;
}

async function writeOutputFile(result) {
  const outputPath = path.join(__dirname, "stage6_priority_output.json");
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");

  await safeLog(
    "info",
    "utils",
    `wrote ranked priority notifications to ${outputPath}`
  );

  return outputPath;
}

async function main() {
  const topN = Number.parseInt(process.env.TOP_N ?? String(DEFAULT_TOP_N), 10);
  const selectedTopN = Number.isNaN(topN) || topN <= 0 ? DEFAULT_TOP_N : topN;

  await safeLog(
    "info",
    "service",
    `starting Stage 6 priority inbox ranking for top ${selectedTopN}`
  );

  const notifications = await fetchNotifications();
  const topNotifications = getTopNotifications(notifications, selectedTopN);

  await safeLog(
    "debug",
    "service",
    `calculated top ${topNotifications.length} priority notifications using heap`
  );

  const output = {
    generatedAt: new Date().toISOString(),
    requestedTopN: selectedTopN,
    totalNotificationsFetched: notifications.length,
    priorityWeights: TYPE_WEIGHTS,
    topNotifications,
  };

  const outputPath = await writeOutputFile(output);
  return { outputPath, output };
}

if (require.main === module) {
  main().catch(async (error) => {
    await safeLog(
      "error",
      "handler",
      `stage 6 priority inbox failed: ${error.message}`
    );
    process.exitCode = 1;
  });
}

module.exports = {
  TYPE_WEIGHTS,
  buildPriorityRecord,
  getTopNotifications,
  fetchNotifications,
  main,
};
