/** Local validation only: reuse all application plugins with smaller build memory usage. */
import applicationConfig from "../../../apps/web/vite.config";

export default function sprintConfig(environment: Parameters<typeof applicationConfig>[0]) {
  const config = applicationConfig(environment);
  return {
    ...config,
    build: {
      ...config.build,
      sourcemap: false,
      reportCompressedSize: false,
    },
  };
}
