import { motion } from "framer-motion";
import {
  MessageCircle,
  Zap,
  Globe,
  Shield,
  Users,
  ArrowRight,
  Sparkles,
  Radio,
} from "lucide-react";
import { useNavigate } from "react-router";

const features = [
  {
    icon: MessageCircle,
    title: "1-on-1 & Group Chat",
    desc: "Private conversations or group rooms — chat your way.",
  },
  {
    icon: Radio,
    title: "Pulse Match",
    desc: "Hit 'Start' and get matched with a random stranger instantly.",
  },
  {
    icon: Zap,
    title: "Real-time Messaging",
    desc: "Messages delivered instantly with live typing indicators.",
  },
  {
    icon: Globe,
    title: "Media Sharing",
    desc: "Send images, GIFs, and files right inside your chat.",
  },
  {
    icon: Users,
    title: "User Profiles & Status",
    desc: "See who's online, set your status, and personalize your profile.",
  },
  {
    icon: Shield,
    title: "Free & Private",
    desc: "No ads, no tracking. Your conversations stay yours.",
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Radio className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Pulse<span className="text-primary">.</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-chart-2/10 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-primary/10"
                animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8"
          >
            <Sparkles className="h-4 w-4" />
            Free & instant — no sign-up friction
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            Connect with
            <br />
            <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-5 bg-clip-text text-transparent">
              anyone, anywhere.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Pulse is a real-time chat app with Omegle-style random matching,
            group conversations, and instant media sharing. Free, fast, private.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle className="h-5 w-5" />
              Start Chatting — It's Free
            </button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/30 to-chart-2/30 flex items-center justify-center">
                    <Users className="h-3 w-3 text-foreground/60" />
                  </div>
                ))}
              </div>
              <span><strong className="text-foreground">10K+</strong> active users</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-6 border-t border-border/40">
        <div className="mx-auto max-w-6xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-center mb-12"
          >
            Everything you need to chat
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border/60 bg-card/50 p-6 hover:bg-card hover:border-primary/20 transition-all group"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-primary/20 via-background to-chart-2/20 border border-border/60 p-12 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to connect?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Jump into a conversation with strangers or friends. It takes 5 seconds.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/25"
          >
            Start Now <ArrowRight className="h-5 w-5" />
          </button>
        </motion.div>
      </section>

      <footer className="border-t border-border/40 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Pulse</span>
          </div>
          <p>Free & private chat. Built with ❤️</p>
        </div>
      </footer>
    </div>
  );
}
