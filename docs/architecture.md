# Foundation architecture

The browser owns capture guidance, project interaction, geometry correction,
and visualization. A separate worker owns video processing and reconstruction.
They communicate only through versioned contracts and private persisted jobs.

```text
guided capture -> private upload -> reconstruction job -> unscaled room
  -> reference measurement -> scaled editable room -> furnished layouts
```

The first feasibility milestone must validate ordinary phone video before the
product commits to a reconstruction engine. The initial web preview therefore
contains no simulated upload or reconstruction behavior.

Cloudflare Pages hosts the static web application. A later change will connect
the application to Supabase for authentication, persistence, and private media.
The reconstruction worker can begin on developer-owned hardware by claiming
jobs through authenticated outbound requests, then move to managed compute
without changing the room-model contract.
