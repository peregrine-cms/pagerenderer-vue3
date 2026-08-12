package com.peregrine.pagerender.vue3.models;

import static com.peregrine.commons.util.PerConstants.JACKSON;
import static com.peregrine.commons.util.PerConstants.JCR_CONTENT;
import static com.peregrine.commons.util.PerConstants.JCR_TITLE;
import static com.peregrine.commons.util.PerConstants.JSON;
import static com.peregrine.commons.util.PerConstants.SLASH;
import static com.peregrine.pagerender.vue3.models.PageRenderVue3Constants.PR_VUE3_COMPONENT_PAGE_TYPE;

import com.peregrine.nodetypes.models.IComponent;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import javax.inject.Inject;
import javax.inject.Named;

import org.apache.commons.lang3.StringUtils;
import org.apache.sling.api.resource.Resource;
import org.apache.sling.api.resource.ResourceUtil;
import org.apache.sling.api.resource.ValueMap;
import org.apache.sling.models.annotations.DefaultInjectionStrategy;
import org.apache.sling.models.annotations.Exporter;
import org.apache.sling.models.annotations.Model;
import org.apache.sling.models.annotations.Optional;
import org.apache.sling.models.factory.ModelFactory;

/**
 * Sling Model for Vue 3 Page components.
 * 
 * Handles page-level properties including:
 * - Site CSS and JS includes
 * - Template inheritance
 * - Open Graph metadata
 * - SEO settings
 * 
 * Properties are inherited from ancestor pages and templates.
 */
@Model(
    adaptables = Resource.class,
    resourceType = {PR_VUE3_COMPONENT_PAGE_TYPE},
    defaultInjectionStrategy = DefaultInjectionStrategy.OPTIONAL,
    adapters = IComponent.class)
@Exporter(
    name = JACKSON,
    extensions = JSON)
public class PageModel extends Container {

    // Property names
    public static final String SITE_CSS = "siteCSS";
    public static final String SITE_JS = "siteJS";
    public static final String PREFETCH_DNS = "prefetchDNS";
    public static final String DOMAINS = "domains";
    public static final String TEMPLATE = "template";
    public static final String BRAND = "brand";

    @Inject
    private ModelFactory modelFactory;

    @Inject @Optional
    private String[] prefetchDNS;

    @Inject @Optional
    private String[] siteCSS;

    @Inject @Optional
    private String[] siteJS;

    @Inject @Optional
    private String[] domains;

    @Inject @Named(TEMPLATE) @Optional
    private String template;

    @Inject @Named(JCR_TITLE) @Optional
    private String title;

    @Inject @Optional
    private String description;

    @Inject @Optional
    private String brand;

    // Open Graph properties
    @Inject @Optional
    private String ogTitle;

    @Inject @Optional
    private String ogDescription;

    @Inject @Optional
    private String ogImage;

    @Inject @Optional
    private String ogType;

    // SEO properties
    @Inject @Optional
    private Boolean noIndex = false;

    @Inject @Optional
    private Boolean noFollow = false;

    public PageModel(Resource r) {
        super(r);
    }

    // ========================================================================
    // Path utilities
    // ========================================================================

    /**
     * Get the site root path (e.g., /content/mysite)
     */
    public String getSiteRoot() {
        String path = getPagePath();
        String[] segments = path.split(SLASH);
        if (segments.length >= 4) {
            return String.join(SLASH, segments[0], segments[1], segments[2], segments[3]);
        }
        return path;
    }

    /**
     * Get the page path (parent of jcr:content)
     */
    public String getPagePath() {
        return getResource().getParent().getPath();
    }

    // ========================================================================
    // Property inheritance
    // ========================================================================

    /**
     * Get the parent page's jcr:content resource
     */
    private Resource getParentContent(Resource res) {
        Resource page = res.getParent();
        if (page != null) {
            Resource parentPage = page.getParent();
            if (Objects.nonNull(parentPage)) {
                Resource child = parentPage.getChild(JCR_CONTENT);
                if (child != null) {
                    return child;
                }
            }
        }
        return null;
    }

    /**
     * Get an inherited property value from ancestors
     */
    private Object getInheritedProperty(String propertyName) {
        Resource parentContent = getParentContent(getResource());
        while (parentContent != null) {
            ValueMap props = ResourceUtil.getValueMap(parentContent);
            Object value = props.get(propertyName);
            if (value != null) {
                return value;
            }
            parentContent = getParentContent(parentContent);
        }
        return null;
    }

    /**
     * Get the template's PageModel if a template is configured
     */
    private PageModel getTemplatePageModel() {
        String templatePath = getTemplate();
        if (templatePath == null) return null;
        
        Resource templateResource = getResource().getResourceResolver()
            .getResource(templatePath + SLASH + JCR_CONTENT);
        if (templateResource == null) return null;
        
        return (PageModel) modelFactory.getModelFromResource(templateResource);
    }

    // ========================================================================
    // Site configuration properties
    // ========================================================================

    public String[] getPrefetchDNS() {
        if (prefetchDNS == null) {
            String[] value = (String[]) getInheritedProperty(PREFETCH_DNS);
            if (value != null && value.length > 0) return value;
            
            PageModel templateModel = getTemplatePageModel();
            if (templateModel != null) {
                return templateModel.getPrefetchDNS();
            }
        }
        return prefetchDNS;
    }

    public String[] getSiteCSS() {
        if (siteCSS == null) {
            String[] value = (String[]) getInheritedProperty(SITE_CSS);
            if (value != null && value.length > 0) return value;
            
            PageModel templateModel = getTemplatePageModel();
            if (templateModel != null) {
                return templateModel.getSiteCSS();
            }
        }
        return siteCSS;
    }

    public String[] getSiteJS() {
        if (siteJS == null) {
            String[] value = (String[]) getInheritedProperty(SITE_JS);
            if (value != null && value.length > 0) return value;
            
            PageModel templateModel = getTemplatePageModel();
            if (templateModel != null) {
                return templateModel.getSiteJS();
            }
        }
        return siteJS;
    }

    public String[] getDomains() {
        if (domains == null) {
            String[] value = (String[]) getInheritedProperty(DOMAINS);
            if (value != null && value.length > 0) return value;
            
            PageModel templateModel = getTemplatePageModel();
            if (templateModel != null) {
                return templateModel.getDomains();
            }
        }
        return domains;
    }

    /**
     * Get the primary (first) configured domain
     */
    public String getPrimaryDomain() {
        String[] allDomains = getDomains();
        return (allDomains != null && allDomains.length > 0) ? allDomains[0] : "";
    }

    public String getTemplate() {
        if (template == null) {
            String value = (String) getInheritedProperty(TEMPLATE);
            if (value != null) {
                this.template = value;
                return value;
            }
        }
        return template;
    }

    // ========================================================================
    // Page metadata
    // ========================================================================

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getBrand() {
        if (brand == null) {
            String value = (String) getInheritedProperty(BRAND);
            if (StringUtils.isNotBlank(value)) return value;
            
            PageModel templateModel = getTemplatePageModel();
            if (templateModel != null) {
                return templateModel.getBrand();
            }
        }
        return brand;
    }

    // ========================================================================
    // Open Graph metadata
    // ========================================================================

    public String getOgTitle() {
        return StringUtils.isBlank(ogTitle) ? title : ogTitle;
    }

    public String getOgDescription() {
        return StringUtils.isBlank(ogDescription) ? description : ogDescription;
    }

    public String getOgImage() {
        if (StringUtils.isNotBlank(ogImage)) {
            return ogImage;
        }
        
        // Try inherited
        String inherited = (String) getInheritedProperty("ogImage");
        if (StringUtils.isNotBlank(inherited)) {
            return inherited;
        }
        
        // Try template
        PageModel templateModel = getTemplatePageModel();
        if (templateModel != null) {
            return templateModel.ogImage;
        }
        
        return null;
    }

    /**
     * Get the absolute Open Graph image URL
     */
    public String getAbsOgImage() {
        String imagePath = getOgImage();
        if (StringUtils.isBlank(imagePath)) {
            return "";
        }
        
        String domain = StringUtils.isNotBlank(getPrimaryDomain()) 
            ? getPrimaryDomain() 
            : "http://localhost:8080";
        
        return domain + imagePath;
    }

    public String getOgType() {
        return StringUtils.isNotBlank(ogType) ? ogType : "website";
    }

    // ========================================================================
    // SEO
    // ========================================================================

    /**
     * Get the canonical URL for this page
     */
    public String getCanonicalUrl() {
        String primaryDomain = getPrimaryDomain();
        String pagePath = getPagePath().replace(getSiteRoot(), "");
        
        return StringUtils.isNotBlank(primaryDomain)
            ? primaryDomain + pagePath + ".html"
            : pagePath + ".html";
    }

    /**
     * Get the robots meta content
     */
    public String getMetaRobots() {
        StringBuilder robots = new StringBuilder();
        
        if (noIndex) robots.append("noindex");
        if (noIndex && noFollow) robots.append(",");
        if (noFollow) robots.append("nofollow");
        
        return robots.toString();
    }

    public Boolean getNoIndex() {
        return noIndex;
    }

    public Boolean getNoFollow() {
        return noFollow;
    }
}
