package apps.pagerendervue3.structure.page;

import javax.script.Bindings;

import org.apache.sling.scripting.sightly.pojo.Use;
import org.apache.sling.api.resource.Resource;

import org.apache.sling.models.factory.ModelFactory;
import org.apache.sling.api.SlingHttpServletRequest;
import org.apache.sling.api.scripting.SlingScriptHelper;

public class Helper implements Use {

    private Object model;
    private String siteRootPath;
    private String siteName;

    public String getHello() {
        return "hello";
    }

    public String getSiteName() {
        return siteName;
    }

    public Object getModel() {
        return model;
    }

    public String getSiteRootPath() {
        return siteRootPath;
    }

    public String getModelClass() {
        return model.getClass().toString();
    }

    public void init(Bindings bindings) {
        Resource resource = (Resource) bindings.get("resource");
        SlingHttpServletRequest request = (SlingHttpServletRequest) bindings.get("request");
        SlingScriptHelper sling = (SlingScriptHelper) bindings.get("sling");

        String path = resource.getPath();
        path = path.substring("/content/".length());

        int slash = path.indexOf("/");
        siteName = slash > 0 ? path.substring(0, path.indexOf("/")) : path;
        siteRootPath = "/content/" + siteName + "/pages";

        try {
            model = sling.getService(ModelFactory.class).getModelFromResource(resource);
        } catch(Throwable t) {
            model = sling.getService(ModelFactory.class).getModelFromRequest(request);
        }
    }
}
