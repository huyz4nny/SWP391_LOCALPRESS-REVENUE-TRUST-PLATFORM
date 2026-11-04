package com.localpress.administration.service;

import org.springframework.stereotype.Component;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.*;
import java.util.*;

/** Bounded HEAD probe: pinned public IPv4, verified TLS, no cookies or credentials. */
@Component
public class AdUrlProbe {
    public record Result(String outcome, String resolvedUrl, String detail) {}
    record Reply(int status, String location) {}
    interface Resolver { InetAddress[] resolve(String host) throws IOException; }
    interface Transport { Reply head(URI uri, InetAddress address) throws IOException; }
    private final Resolver resolver;
    private final Transport transport;
    public AdUrlProbe() { this(InetAddress::getAllByName, AdUrlProbe::head); }
    AdUrlProbe(Resolver resolver, Transport transport) { this.resolver=resolver; this.transport=transport; }

    public Result check(String target, String baseline) {
        try {
            URI uri = validUri(target);
            Set<String> visited = new HashSet<>();
            for (int hop=0; hop<5; hop++) {
                if (!visited.add(uri.toString())) return new Result("ERROR",null,"Vòng lặp chuyển hướng.");
                InetAddress[] addresses=resolver.resolve(uri.getHost());
                if (addresses.length==0) throw new IOException();
                // Reject mixed public/private DNS answers; connect to the exact validated address.
                for (InetAddress address:addresses) if (!publicAddress(address))
                    return new Result("BLOCKED",null,"Đích là địa chỉ nội bộ hoặc không được phép.");
                InetAddress address=Arrays.stream(addresses).filter(a->a instanceof Inet4Address).findFirst().orElse(null);
                if(address==null) return new Result("ERROR",null,"Chưa hỗ trợ đích chỉ có IPv6.");
                Reply reply=transport.head(uri,address);
                if (Set.of(301,302,303,307,308).contains(reply.status())) {
                    if(reply.location()==null) return new Result("ERROR",null,"Chuyển hướng thiếu địa chỉ đích.");
                    URI next=validUri(uri.resolve(reply.location()).toString());
                    if(uri.getScheme().equals("https") && next.getScheme().equals("http"))
                        return new Result("BLOCKED",null,"Chuyển hướng hạ cấp HTTPS xuống HTTP.");
                    uri=next; continue;
                }
                if(reply.status()<200 || reply.status()>=300)
                    return new Result("ERROR",uri.toString(),"HTTP "+reply.status()+"; cần kiểm tra thủ công.");
                String expected=validUri(baseline==null||baseline.isBlank()?target:baseline).toString();
                return new Result(expected.equals(uri.toString())?"OK":"CHANGED",uri.toString(),
                        expected.equals(uri.toString())?"URL phản hồi thành công; không phải kiểm tra mã độc.":"Đích cuối khác địa chỉ đã duyệt.");
            }
            return new Result("ERROR",null,"Vượt quá giới hạn chuyển hướng.");
        } catch(IllegalArgumentException e) { return new Result("BLOCKED",null,"URL không hợp lệ hoặc cổng không được phép."); }
        catch(IOException e) { return new Result("ERROR",null,"Không kết nối được, lỗi TLS/DNS hoặc hết thời gian chờ."); }
    }
    static URI validUri(String text) {
        URI uri=URI.create(text).normalize();
        String scheme=uri.getScheme()==null?"":uri.getScheme().toLowerCase(Locale.ROOT);
        if(text.length()>2048 || !Set.of("http","https").contains(scheme) || uri.getHost()==null
                || uri.getUserInfo()!=null || (uri.getPort()!=-1 && uri.getPort()!=(scheme.equals("https")?443:80)))
            throw new IllegalArgumentException();
        // Preserve escaped path/query semantics (e.g. %2F must not turn into /).
        String path=uri.getRawPath()==null||uri.getRawPath().isEmpty()?"/":uri.getRawPath();
        return URI.create(scheme+"://"+uri.getHost().toLowerCase(Locale.ROOT)+path
                +(uri.getRawQuery()==null?"":"?"+uri.getRawQuery()));
    }
    static boolean publicAddress(InetAddress address) {
        if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()
                ||address.isSiteLocalAddress()||address.isMulticastAddress()) return false;
        byte[] b=address.getAddress();
        if(b.length==16) return (b[0]&0xe0)==0x20; // only global-unicast IPv6; never used to connect
        int a=b[0]&255,c=b[1]&255,d=b[2]&255;
        return !(a==0||a==10||a==127||a>=224||a==169&&c==254||a==172&&c>=16&&c<=31
                ||a==192&&(c==168||c==0||c==2)||a==100&&c>=64&&c<=127
                ||a==198&&(c==18||c==19||c==51&&d==100)||a==203&&c==0&&d==113);
    }
    private static Reply head(URI uri, InetAddress address) throws IOException {
        boolean tls=uri.getScheme().equals("https");
        try(Socket raw=new Socket()) {
            raw.connect(new InetSocketAddress(address,tls?443:80),3000);
            raw.setSoTimeout(3000);
            Socket socket=raw;
            if(tls) {
                SSLSocket ssl=(SSLSocket)((SSLSocketFactory)SSLSocketFactory.getDefault()).createSocket(raw,uri.getHost(),443,true);
                SSLParameters params=ssl.getSSLParameters(); params.setEndpointIdentificationAlgorithm("HTTPS");
                ssl.setSSLParameters(params); ssl.setSoTimeout(3000); ssl.startHandshake(); socket=ssl;
            }
            String path=uri.getRawPath()+(uri.getRawQuery()==null?"":"?"+uri.getRawQuery());
            socket.getOutputStream().write(("HEAD "+path+" HTTP/1.1\r\nHost: "+uri.getHost()
                    +"\r\nUser-Agent: LocalPress-URL-Monitor/1.0\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
            var bytes=new ByteArrayOutputStream(); int previous=0,matched=0;
            InputStream input=socket.getInputStream();
            long deadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
            while(bytes.size()<16384 && System.nanoTime()<deadline) {
                int ch=input.read(); if(ch<0) break; bytes.write(ch);
                if(ch==10 && previous==13) matched++; else if(ch!=13) matched=0;
                if(matched==2) break; previous=ch;
            }
            if(matched!=2) throw new IOException("Incomplete headers");
            String[] lines=bytes.toString(StandardCharsets.ISO_8859_1).split("\r\n");
            String[] status=lines[0].split(" ");
            if(status.length<2||!status[1].matches("[0-9]{3}")) throw new IOException("Invalid status");
            String location=null;
            for(String line:lines) if(line.toLowerCase(Locale.ROOT).startsWith("location:")) location=line.substring(9).trim();
            return new Reply(Integer.parseInt(status[1]),location);
        }
    }
}
