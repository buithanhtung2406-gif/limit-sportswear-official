import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appState } from "@/db/schema";

type VersionedState<T> = {
  data: T;
  version: number;
};

export async function readJsonState<T>(
  key: string,
  createInitial: () => T,
  normalize: (state: T) => void,
): Promise<VersionedState<T>> {
  const database = getDb();
  let row = await database.query.appState.findFirst({
    where: eq(appState.key, key),
  });

  if (!row) {
    const initial = createInitial();
    await database
      .insert(appState)
      .values({ key, value: JSON.stringify(initial), version: 1 })
      .onConflictDoNothing();
    row = await database.query.appState.findFirst({
      where: eq(appState.key, key),
    });
  }

  if (!row) throw new Error("Không thể khởi tạo dữ liệu cửa hàng.");
  const data = JSON.parse(row.value) as T;
  normalize(data);
  return { data, version: row.version };
}

export async function mutateJsonState<T>(
  key: string,
  createInitial: () => T,
  normalize: (state: T) => void,
  change: (state: T) => void,
): Promise<T> {
  const database = getDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await readJsonState(key, createInitial, normalize);
    const next = structuredClone(current.data);
    change(next);

    const updated = await database
      .update(appState)
      .set({
        value: JSON.stringify(next),
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(appState.key, key), eq(appState.version, current.version)))
      .returning({ version: appState.version });

    if (updated.length === 1) return next;
  }

  throw new Error("Dữ liệu vừa được thay đổi ở phiên khác. Vui lòng thử lại.");
}
