export interface Metrics {
  name: string;
  data: {
    install: {duration: number};
    rebuild?: {duration: number};
    setup: {duration: number};
  };
}

export interface RunResult {
  startTime: string;
  hasPassed: boolean;
  endTime: string;
  metrics: Metrics[];
}
