import { describe, it, expect } from "vitest";
import { greeting, productivityScore, filterRolloverTasks, weekData } from "@/lib/insights";

describe("greeting", () => {
  it("returns Bom dia before noon", () => {
    expect(greeting(new Date("2025-01-01T08:00:00"))).toBe("Bom dia");
  });
  it("returns Boa tarde between 12 and 18", () => {
    expect(greeting(new Date("2025-01-01T14:00:00"))).toBe("Boa tarde");
  });
  it("returns Boa noite from 18h", () => {
    expect(greeting(new Date("2025-01-01T20:00:00"))).toBe("Boa noite");
  });
});

describe("productivityScore", () => {
  it("returns 25 when 5/10 tasks done with no habits/goals", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({ done: i < 5 }));
    expect(productivityScore({ tasks, habits: [], goals: [] })).toBe(25);
  });
  it("returns 100 when everything maxed", () => {
    const tasks = [{ done: true }, { done: true }];
    const habits = [{ streak: 7 }];
    const goals = [{ progress: 1, target: 1 }];
    expect(productivityScore({ tasks, habits, goals })).toBe(100);
  });
  it("returns 25 baseline when no tasks", () => {
    expect(productivityScore({ tasks: [], habits: [], goals: [] })).toBe(25);
  });
  it("returns only taskScore when habits have streak 0", () => {
    const tasks = [{ done: true }, { done: true }];
    const habits = [{ streak: 0 }];
    expect(productivityScore({ tasks, habits, goals: [] })).toBe(50);
  });
});

describe("filterRolloverTasks", () => {
  it("keeps only undone tasks from previous days", () => {
    const today = new Date("2025-05-12T10:00:00Z");
    const tasks = [
      { done: false, due_date: "2025-05-10" }, // overdue
      { done: true, due_date: "2025-05-10" }, // overdue but done
      { done: false, due_date: "2025-05-12" }, // today
      { done: false, due_date: null }, // no date
      { done: false, due_date: "2025-05-13" }, // future
    ];
    expect(filterRolloverTasks(tasks, today)).toHaveLength(1);
  });
  it("ignores tasks due today", () => {
    const today = new Date("2025-05-12T10:00:00Z");
    const tasks = [{ done: false, due_date: "2025-05-12" }];
    expect(filterRolloverTasks(tasks, today)).toHaveLength(0);
  });
});

describe("weekData", () => {
  it("groups tasks by day across 7 buckets", () => {
    const now = new Date("2025-05-12T12:00:00Z").getTime();
    const tasks = [
      { done: true, updated_at: "2025-05-12T09:00:00Z" },
      { done: false, updated_at: "2025-05-12T10:00:00Z" },
      { done: true, updated_at: "2025-05-11T10:00:00Z" },
    ];
    const data = weekData(tasks, now);
    expect(data).toHaveLength(7);
    const last = data[6];
    expect(last.total).toBe(2);
    expect(last.done).toBe(1);
  });
});
