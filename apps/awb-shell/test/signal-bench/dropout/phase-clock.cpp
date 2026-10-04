#include <mach/mach_time.h>
#include <notify.h>
#include <os/log.h>
#include <os/signpost.h>
#include <time.h>
#include <unistd.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>

static unsigned long long machNS() {
    mach_timebase_info_data_t t;
    mach_timebase_info(&t);
    return (unsigned long long)((__uint128_t)mach_absolute_time() * t.numer / t.denom);
}
static void stamp(const char *event) {
    auto before = machNS();
    timespec wall;
    clock_gettime(CLOCK_REALTIME, &wall);
    auto after = machNS();
    printf("{\"event\":\"%s\",\"machBeforeNs\":%llu,\"machAfterNs\":%llu,\"wallNs\":%llu,\"pid\":%d}\n",
        event, before, after, (unsigned long long)wall.tv_sec * 1000000000ULL + wall.tv_nsec, getpid());
    fflush(stdout);
}
int main(int argc, char **argv) {
    if (argc == 1 || !strcmp(argv[1], "clock")) { stamp("clock"); return 0; }
    if (argc == 3 && !strcmp(argv[1], "mark")) {
        auto log = os_log_create("org.awb.rack.bench", OS_LOG_CATEGORY_POINTS_OF_INTEREST);
        usleep(50000); // Let Instruments discover this short-lived marker process.
        stamp("beforeSignpost");
        os_signpost_event_emit(log, OS_SIGNPOST_ID_EXCLUSIVE, "AWBPhase", "%{public}s", argv[2]);
        stamp("afterSignpost");
        usleep(20000); // Allow the log message to drain before process exit.
        return 0;
    }
    if (argc == 4 && !strcmp(argv[1], "wait-notify")) {
        int token, changed;
        auto status = notify_register_check(argv[2], &token);
        if (status != NOTIFY_STATUS_OK) { fprintf(stderr, "notify_register_check: %u\n", status); return 2; }
        notify_check(token, &changed); // Clear the initial changed flag before telling the caller to launch.
        stamp("registered");
        auto deadline = machNS() + strtoull(argv[3], nullptr, 10) * 1000000ULL;
        while (machNS() < deadline) {
            status = notify_check(token, &changed);
            if (status != NOTIFY_STATUS_OK) { notify_cancel(token); return 2; }
            if (changed) { stamp("tracingStartedNotification"); notify_cancel(token); return 0; }
            usleep(5000);
        }
        notify_cancel(token);
        fprintf(stderr, "Tracing-started notification timed out\n");
        return 3;
    }
    fprintf(stderr, "usage: phase-clock [clock | mark LABEL | wait-notify NAME TIMEOUT_MS]\n");
    return 2;
}
