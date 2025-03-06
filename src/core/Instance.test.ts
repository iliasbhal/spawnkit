import { Instance } from "@/core/Instance";

describe("Instance", () => {
	it.todo("should stay alive while a streaming is happening");
	it.todo("should emit when snapshot is updated");
	it.todo("each instance emit snapshots changes on its own channel");
	it.todo("call .on() with lifecycle events");
});

describe("Mount / Unmount", () => {
	it.todo("should call initialize when mounted")
	it.todo("should wait initialize to be done processing events")
	it.todo('if instance fails to initialize, it should call dispose')
	it.todo("should call dispose when unmounting")
	it.todo("should wait for dispose to be done/fail before releasing the lock")
	it.todo('if it fails, transiant requests should fail on the client')
	it.todo('if it fails, error should be emitted to client.on(\'error\') handler')
});
