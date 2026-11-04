package com.localpress.administration.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.net.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
class AdUrlProbeTest {
    InetAddress[] publicIp() throws java.io.IOException { return new InetAddress[]{InetAddress.getByName("8.8.8.8")}; }
    @ParameterizedTest @ValueSource(strings={"127.0.0.1","10.0.0.1","169.254.169.254","192.168.1.1","172.16.1.1","100.64.0.1","0.0.0.0","224.0.0.1","::1","fd00::1"})
    void internalAddressesNeverReachTransport(String ip) {
        var probe=new AdUrlProbe(host->new InetAddress[]{InetAddress.getByName(ip)},(uri,address)->{fail("No internal connection allowed");return null;});
        assertEquals("BLOCKED",probe.check("https://example.com/",null).outcome());
    }
    @ParameterizedTest @ValueSource(strings={"file:///etc/passwd","http://user:pass@example.com/","http://example.com:8080/","javascript:alert(1)"})
    void invalidUrlsNeverResolve(String target) {
        var probe=new AdUrlProbe(host->{fail("No DNS allowed");return null;},(u,a)->null);
        assertEquals("BLOCKED",probe.check(target,null).outcome());
    }
    @Test void pinnedAddressAndMatchingBaselineAreOk() {
        var probe=new AdUrlProbe(host->publicIp(),(uri,address)->{assertEquals("8.8.8.8",address.getHostAddress());return new AdUrlProbe.Reply(200,null);});
        assertEquals("OK",probe.check("https://example.com",null).outcome());
    }
    @Test void changedRedirectIsReportedAndEachDestinationValidated() {
        var count=new AtomicInteger();
        var probe=new AdUrlProbe(host->publicIp(),(u,a)->count.getAndIncrement()==0?new AdUrlProbe.Reply(302,"https://other.example/landing"):new AdUrlProbe.Reply(200,null));
        var result=probe.check("https://example.com/",null);
        assertEquals("CHANGED",result.outcome());assertEquals("https://other.example/landing",result.resolvedUrl());
    }
    @Test void redirectIntoPrivateNetworkNeverConnects() {
        var count=new AtomicInteger();
        var probe=new AdUrlProbe(host->host.equals("private.example")?new InetAddress[]{InetAddress.getByName("127.0.0.1")}:publicIp(),(u,a)->{count.incrementAndGet();return new AdUrlProbe.Reply(302,"https://private.example/");});
        assertEquals("BLOCKED",probe.check("https://example.com/",null).outcome());assertEquals(1,count.get());
    }
    @Test void downgradeAndRedirectLoopAreRejected() {
        assertEquals("BLOCKED",new AdUrlProbe(h->publicIp(),(u,a)->new AdUrlProbe.Reply(302,"http://example.com/")).check("https://example.com/",null).outcome());
        assertEquals("ERROR",new AdUrlProbe(h->publicIp(),(u,a)->new AdUrlProbe.Reply(302,"https://example.com/")).check("https://example.com/",null).outcome());
    }
    @Test void timeoutAndHttpErrorAreNotSafe() {
        assertEquals("ERROR",new AdUrlProbe(h->publicIp(),(u,a)->{throw new SocketTimeoutException();}).check("https://example.com/",null).outcome());
        assertEquals("ERROR",new AdUrlProbe(h->publicIp(),(u,a)->new AdUrlProbe.Reply(405,null)).check("https://example.com/",null).outcome());
    }
    @Test void escapedPathAndQueryKeepTheirMeaning() {
        assertEquals("https://example.com/a%2Fb?q=%2F",AdUrlProbe.validUri("https://EXAMPLE.com/a%2Fb?q=%2F#section").toString());
    }
    @Test void redirectBudgetIsFiniteAndMixedDnsIsRejected() {
        var count=new AtomicInteger();
        var probe=new AdUrlProbe(h->publicIp(),(u,a)->new AdUrlProbe.Reply(302,"https://example.com/"+count.incrementAndGet()));
        assertEquals("ERROR",probe.check("https://example.com/start",null).outcome());assertEquals(5,count.get());
        var mixed=new AdUrlProbe(h->new InetAddress[]{InetAddress.getByName("8.8.8.8"),InetAddress.getByName("10.0.0.1")},(u,a)->{fail("No connection for mixed DNS");return null;});
        assertEquals("BLOCKED",mixed.check("https://example.com/",null).outcome());
    }

}
